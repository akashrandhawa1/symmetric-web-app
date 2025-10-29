import assert from 'node:assert';
import { CoachInsightOrchestrator, type CoachInsightContext } from '../lib/coach/LlmOrchestrator';

type StubResponse = string | Error;

class StubGeminiClient {
  private responses: StubResponse[];
  public calls = 0;

  constructor(responses: StubResponse[]) {
    this.responses = [...responses];
  }

  private async handleGenerateContent(): Promise<{ text: string }> {
    this.calls += 1;
    if (this.responses.length === 0) {
      return { text: '' };
    }
    const next = this.responses.shift();
    if (!next) {
      return { text: '' };
    }
    if (next instanceof Error) {
      throw next;
    }
    return { text: next };
  }

  models = {
    generateContent: (_args: unknown) => this.handleGenerateContent(),
  };
}

function buildContext(overrides: Partial<CoachInsightContext> = {}): CoachInsightContext {
  const base: CoachInsightContext = {
    user: { id: 'anon', experience: 'intermediate' },
    exercise: { name: 'Back Squat', phase: 'set', rep: 7 },
    state: 'rise',
    confidence: 0.75,
    metrics: {
      rms_change_pct_last_8s: 12.4,
      mdf_change_pct_last_8s: null,
      ror_trend: 'up',
      symmetry_pct_diff: null,
      motion_artifact: 0.05,
    },
    limits: {
      speak_min_gap_sec: 6,
      max_messages_per_set: 3,
      artifact_threshold: 0.3,
    },
  };

  return {
    ...base,
    ...overrides,
    user: { ...base.user, ...(overrides.user ?? {}) },
    exercise: { ...base.exercise, ...(overrides.exercise ?? {}) },
    metrics: { ...base.metrics, ...(overrides.metrics ?? {}) },
    limits: { ...base.limits, ...(overrides.limits ?? {}) },
    state: overrides.state ?? base.state,
    confidence: overrides.confidence ?? base.confidence,
  };
}

async function testRiseWithCleanSignal() {
  const stub = new StubGeminiClient([
    JSON.stringify({
      primary: 'Recruitment increasing. Nice control.',
      secondary: 'Activation up ~12% in 8s.',
      tags: ['Rise'],
      rest_seconds: 0,
    }),
  ]);
  const clock = { value: 0 };
  const orchestrator = new CoachInsightOrchestrator({ client: stub as any, now: () => clock.value });
  const context = buildContext({
    state: 'rise',
    confidence: 0.78,
    metrics: { rms_change_pct_last_8s: 12.1, motion_artifact: 0.1 },
  });

  const insight = await orchestrator.generateInsight(context, 'state');

  assert.ok(insight, 'Expected an insight for rise state');
  assert.strictEqual(insight?.source, 'llm');
  assert.ok(insight?.headline.includes('Recruitment increasing. Nice control.'), 'Expected combined headline to include first sentence');
  assert.ok(insight?.headline.includes('Activation up ~12% in 8s.'), 'Expected combined headline to include second sentence');
  assert.strictEqual(insight?.subline, undefined);
  assert.deepStrictEqual(insight?.tags, ['Rise']);
  assert.deepStrictEqual(insight?.actions, []);
}

async function testPlateauLowConfidenceFallback() {
  const stub = new StubGeminiClient([]);
  const clock = { value: 0 };
  const orchestrator = new CoachInsightOrchestrator({ client: stub as any, now: () => clock.value });
  const context = buildContext({
    state: 'plateau',
    confidence: 0.5,
    metrics: { rms_change_pct_last_8s: 9.2 },
  });

  const insight = await orchestrator.generateInsight(context, 'state');

  assert.ok(insight, 'Expected fallback insight for low confidence plateau');
  assert.strictEqual(stub.calls, 0, 'Gemini should not be called when confidence is below threshold');
  assert.strictEqual(insight?.source, 'fallback');
  assert.ok(insight?.headline.includes('Not enough signal yet'), 'Expected fallback headline to mention lack of signal');
  assert.strictEqual(insight?.subline, undefined);
  assert.deepStrictEqual(insight?.tags, ['Plateau']);
  assert.deepStrictEqual(insight?.actions, []);
}

async function testFallHighConfidenceCaution() {
  const stub = new StubGeminiClient([
    JSON.stringify({
      primary: 'Quality dipping (activation ↓ ~14%).',
      secondary: 'Rec: end set to protect output.',
      tags: ['Fall'],
      actions: ['end_set'],
      rest_seconds: 0,
    }),
  ]);
  const clock = { value: 0 };
  const orchestrator = new CoachInsightOrchestrator({ client: stub as any, now: () => clock.value });
  const context = buildContext({
    state: 'fall',
    confidence: 0.82,
    metrics: { rms_change_pct_last_8s: -13.6 },
  });

  const insight = await orchestrator.generateInsight(context, 'state');

  assert.ok(insight, 'Expected caution insight for fall state');
  assert.ok(insight?.headline.includes('Quality dipping (activation ↓ ~14%).'), 'Expected fall headline to include activation drop');
  assert.ok(insight?.headline.includes('Rec: end set to protect output.'), 'Expected combined headline to include end-set guidance');
  assert.strictEqual(insight?.subline, undefined);
  assert.deepStrictEqual(insight?.tags, ['Fall']);
  assert.deepStrictEqual(insight?.actions, ['end_set']);
}

async function testHighArtifactFallback() {
  const stub = new StubGeminiClient([]);
  const clock = { value: 0 };
  const orchestrator = new CoachInsightOrchestrator({ client: stub as any, now: () => clock.value });
  const context = buildContext({
    state: 'plateau',
    metrics: { motion_artifact: 0.4 },
  });

  const insight = await orchestrator.generateInsight(context, 'checkpoint');

  assert.ok(insight, 'Expected fallback insight for noisy signal');
  assert.strictEqual(stub.calls, 0);
  assert.ok(insight?.headline.includes('Signal is noisy'), 'Expected artifact fallback to mention noisy signal');
  assert.strictEqual(insight?.subline, undefined);
  assert.deepStrictEqual(insight?.tags, ['Plateau']);
}

async function testRateLimitMinGap() {
  const stub = new StubGeminiClient([
    JSON.stringify({
      primary: 'Recruitment increasing. Nice control.',
      secondary: 'Activation up ~12% in 8s.',
      tags: ['Rise'],
      rest_seconds: 0,
    }),
  ]);
  const clock = { value: 0 };
  const orchestrator = new CoachInsightOrchestrator({ client: stub as any, now: () => clock.value });
  const context = buildContext({
    state: 'rise',
    confidence: 0.78,
    metrics: { rms_change_pct_last_8s: 12.2 },
  });

  const first = await orchestrator.generateInsight(context, 'state');
  assert.ok(first, 'Expected first insight to be generated');
  clock.value += 1000;
  const second = await orchestrator.generateInsight(context, 'checkpoint');
  assert.strictEqual(second, null, 'Second insight should be suppressed by min gap');
  assert.strictEqual(stub.calls, 1, 'Gemini should only be called once');
}

async function testInvalidJsonFallback() {
  const stub = new StubGeminiClient(['not-json']);
  const clock = { value: 0 };
  const orchestrator = new CoachInsightOrchestrator({ client: stub as any, now: () => clock.value });
  const context = buildContext({
    state: 'rise',
    confidence: 0.8,
    metrics: { rms_change_pct_last_8s: 15.4 },
  });

  const insight = await orchestrator.generateInsight(context, 'state');

  assert.ok(insight, 'Expected insight when JSON invalid');
  assert.strictEqual(insight?.source, 'llm');
  assert.ok(insight?.headline.length > 0, 'Headline should not be empty');
  assert.deepStrictEqual(insight?.tags, ['Rise']);
}

async function testNewPromptAndSchema() {
  const stub = new StubGeminiClient([
    JSON.stringify({
      primary: "You're in the zone now. Looking strong and steady.",
      secondary: "I'd say you've got about 1 to 3 more good reps in you.",
      tags: ['Plateau'],
      rest_seconds: 0,
    }),
  ]);
  const clock = { value: 0 };
  const orchestrator = new CoachInsightOrchestrator({ client: stub as any, now: () => clock.value });
  const context = buildContext({
    state: 'plateau',
    confidence: 0.8,
    metrics: { rms_change_pct_last_8s: 2.1 },
  });

  const insight = await orchestrator.generateInsight(context, 'state');

  assert.ok(insight, 'Expected an insight for plateau state with new schema');
  assert.strictEqual(insight?.source, 'fallback');
  assert.ok(insight?.headline.length > 0, 'Fallback headline should not be empty');
  assert.deepStrictEqual(insight?.tags, ['Plateau']);
}

export async function runTests() {
  await testRiseWithCleanSignal();
  await testPlateauLowConfidenceFallback();
  await testFallHighConfidenceCaution();
  await testHighArtifactFallback();
  await testRateLimitMinGap();
  await testInvalidJsonFallback();
  await testNewPromptAndSchema();
  console.log('Coach orchestrator tests passed.');
}
