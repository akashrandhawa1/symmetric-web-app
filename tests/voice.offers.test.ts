import assert from 'node:assert';
import { generatePersonalizedFeedback, judgeFatigue, type SetContext } from '../lib/coach/voice';
import type { UserCoachProfile } from '../types';

const baseProfile: UserCoachProfile = {
  userId: 'test-user',
  preferredPersona: 'calm',
  preferredCue: 'brace',
  explorationRate: 0,
};

const baseContext: SetContext = {
  exerciseName: 'Back Squat',
  setNumber: 2,
  readinessNow: 78,
  readinessChangePct: -3,
  setVolume: { reps: 5 },
  targetRestSec: 90,
  historicalTrend: 'flat',
};

const buildContext = (overrides: Partial<SetContext>): SetContext => ({
  ...baseContext,
  ...overrides,
  setVolume: overrides.setVolume ?? baseContext.setVolume,
});

const hasPrimaryCta = (label: string, ctas: ReturnType<typeof generatePersonalizedFeedback>['ctas']) =>
  ctas.some((cta) => cta.emphasis === 'primary' && cta.label.includes(label));

function testRecoveryOffer() {
  const context = buildContext({
    readinessNow: 58,
    readinessChangePct: -8,
    fatigueFlag: true,
  });
  const output = generatePersonalizedFeedback(context, baseProfile);
  assert.strictEqual(output.offerType, 'recovery');
  assert.ok(output.message.primary.includes("you're getting tired"), 'recovery message should note fatigue');
  assert.ok(output.message.primary.includes('rest a bit longer') || output.message.primary.includes('rest longer'), 'recovery message should explain rest bump');
  assert.ok(output.plan === 'drop5' || output.plan === 'cap1', 'plan should guide drop or cap');
  assert.ok(hasPrimaryCta('Lock in Gains', output.ctas), 'primary CTA should lock in gains');
  assert.ok(output.message.primary.length <= 140, 'message respects character limit');
  assert.ok(output.message.variations && output.message.variations.length >= 3);
  for (const line of output.message.variations ?? []) {
    assert.ok(line.length <= 140, 'variation too long');
    assert.ok(/strength|stronger|strong/i.test(line), 'variation should mention strength goal');
  }
  assert.strictEqual(judgeFatigue(context), 'protect');
}

function testEfficiencyOffer() {
  const context = buildContext({
    symmetryNow: 78,
    readinessNow: 70,
  });
  const output = generatePersonalizedFeedback(context, baseProfile);
  assert.strictEqual(output.offerType, 'efficiency');
  assert.ok(output.message.primary.includes("off-balance"), 'efficiency message should mention balance');
  assert.strictEqual(output.plan, 'tempo212');
  assert.ok(hasPrimaryCta('Fix Form & Continue', output.ctas));
  assert.ok(output.message.variations && output.message.variations.length >= 3);
  assert.strictEqual(judgeFatigue(context), 'neutral');
}

function testProgressOffer() {
  const context = buildContext({
    readinessNow: 90,
    readinessChangePct: 1,
    historicalTrend: 'up',
    fatigueFlag: false,
  });
  const output = generatePersonalizedFeedback(context, baseProfile);
  assert.strictEqual(output.offerType, 'progress');
  assert.ok(output.message.primary.includes("looking strong") || output.message.primary.includes('plenty of energy'));
  assert.strictEqual(output.plan, 'add12');
  assert.ok(hasPrimaryCta('Add 1 Rep & Go', output.ctas));
  assert.ok(output.message.variations && output.message.variations.length >= 3);
  assert.strictEqual(judgeFatigue(context), 'productive');
}

function testFoundationWarmupOffer() {
  const context = buildContext({
    setNumber: 1,
    sessionStage: 'warmup',
    readinessNow: 72,
    historicalTrend: 'flat',
  });
  const output = generatePersonalizedFeedback(context, baseProfile);
  assert.strictEqual(output.offerType, 'foundation');
  const primaryLower = output.message.primary.toLowerCase();
  assert.ok(primaryLower.includes('rest a bit') || primaryLower.includes('rest a moment'));
  assert.strictEqual(output.plan, 'hold');
  assert.ok(hasPrimaryCta('Bank Next Set', output.ctas));
  assert.ok(output.message.variations && output.message.variations.length >= 3);
  assert.strictEqual(judgeFatigue(context), 'neutral');
}

export async function runTests() {
  testRecoveryOffer();
  testEfficiencyOffer();
  testProgressOffer();
  testFoundationWarmupOffer();
}
