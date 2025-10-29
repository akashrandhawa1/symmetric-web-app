import { determineZone, findFatigueRep } from '@/lib/fatigue/engine';
import { TARGET_RANGE, THRESH } from '@/lib/fatigue/thresholds';
import type { Zone, RepFeature } from '@/lib/fatigue/types';

export type LowSignalSpan = [number, number];

export interface SetSummaryMetrics {
  reps: number;
  fatigueRep: number | null;
  zone: Zone;
  baselineRms: number;
  lastRms: number;
  totalRisePct: number;
  slopePctPerRep: number;
  signalConfidenceAvg: number;
  lowSignalSpans: LowSignalSpan[];
  repVelocityAvg?: number;
  notes: string[];
}

export interface SetSummaryPayload {
  metrics: SetSummaryMetrics;
  payload: GeminiSetRequest;
}

export interface GeminiSetRequest {
  session_meta: {
    goal: string;
    target_window: { min: number; max: number };
    unit: string;
  };
  set_summary: {
    reps: number;
    fatigue_rep: number | null;
    zone_at_end: Zone;
    baseline_rms: number;
    last_rms: number;
    total_rise_pct: number;
    slope_pct_per_rep: number;
    signal_conf_avg: number;
    low_signal_spans?: LowSignalSpan[];
    rep_velocity_avg?: number;
    notes?: string[];
  };
  constraints: {
    copy_style: 'human_trainer';
    lines: number;
    line_max_chars: number;
    rest_seconds_default: number;
    rest_seconds_light: number;
  };
}

export interface CoachRestAdvice {
  source: 'gemini' | 'fallback';
  primary: string;
  secondary: string;
  restSeconds: number;
  effortDelta: -1 | 0 | 1;
  why?: string;
}

export interface CoachSetSummaryRecord {
  metrics: SetSummaryMetrics;
  restAdvice: CoachRestAdvice;
  exerciseName?: string | null;
  geminiResponse?: unknown;
  timestamp: number;
}

export interface WhatIfScenario {
  title: string;
  action: string;
  strengthDeltaPct: number;
  readinessDeltaPct: number;
  rationale: string;
}

const toPercent = (value: number): number => Math.round(value * 1000) / 10;

const clamp = (value: number, min: number, max: number): number => Math.max(min, Math.min(max, value));

const average = (values: Array<number | null | undefined>): number | null => {
  const filtered = values.filter((value): value is number => typeof value === 'number' && Number.isFinite(value));
  if (!filtered.length) return null;
  return filtered.reduce((sum, value) => sum + value, 0) / filtered.length;
};

export const computeLowSignalSpans = (reps: RepFeature[]): LowSignalSpan[] => {
  const spans: LowSignalSpan[] = [];
  let start: number | null = null;
  for (let i = 0; i < reps.length; i += 1) {
    const rep = reps[i];
    if (rep.signalConfidence < THRESH.LOW_SIGNAL) {
      if (start == null) start = rep.idx;
    } else if (start != null) {
      const endIdx = reps[i - 1]?.idx ?? rep.idx;
      spans.push([start, endIdx]);
      start = null;
    }
  }
  if (start != null) {
    const endIdx = reps[reps.length - 1]?.idx ?? start;
    spans.push([start, endIdx]);
  }
  return spans;
};

export const computeSetSummary = (reps: RepFeature[]): SetSummaryMetrics | null => {
  if (!reps.length) return null;
  const zone = determineZone(reps, TARGET_RANGE);
  const fatigueRep = findFatigueRep(reps, TARGET_RANGE);
  const baseline = reps[0]?.rmsNorm ?? 1;
  const last = reps[reps.length - 1]?.rmsNorm ?? baseline;
  const prev = reps.length > 1 ? reps[reps.length - 2].rmsNorm : last;
  const totalRise = (last - baseline) / Math.max(1e-6, baseline);
  const slope = (last - prev) / Math.max(1e-6, prev);
  const signalConfAvg =
    reps.reduce((sum, rep) => sum + rep.signalConfidence, 0) / Math.max(1, reps.length);
  const lowSignalSpans = computeLowSignalSpans(reps);
  const repVelocityAvg =
    average(reps.map((rep) => (typeof rep.repVelocity === 'number' ? rep.repVelocity : null))) ??
    undefined;

  const notes: string[] = [];
  if (
    fatigueRep != null &&
    fatigueRep >= TARGET_RANGE.min &&
    fatigueRep <= TARGET_RANGE.max
  ) {
    notes.push('2-rep confirmation met inside window');
  }
  if (lowSignalSpans.length) {
    notes.push(
      `Low signal spans detected at reps ${lowSignalSpans
        .map(([from, to]) => (from === to ? `${from}` : `${from}-${to}`))
        .join(', ')}`,
    );
  }

  return {
    reps: reps.length,
    fatigueRep,
    zone,
    baselineRms: baseline,
    lastRms: last,
    totalRisePct: totalRise,
    slopePctPerRep: slope,
    signalConfidenceAvg: signalConfAvg,
    lowSignalSpans,
    repVelocityAvg,
    notes,
  };
};

export const buildGeminiSetRequest = (
  metrics: SetSummaryMetrics,
  overrides?: Partial<GeminiSetRequest['constraints']>,
): GeminiSetRequest => {
  const summary: GeminiSetRequest['set_summary'] = {
    reps: metrics.reps,
    fatigue_rep: metrics.fatigueRep,
    zone_at_end: metrics.zone,
    baseline_rms: Number(metrics.baselineRms.toFixed(3)),
    last_rms: Number(metrics.lastRms.toFixed(3)),
    total_rise_pct: Number(metrics.totalRisePct.toFixed(4)),
    slope_pct_per_rep: Number(metrics.slopePctPerRep.toFixed(4)),
    signal_conf_avg: Number(metrics.signalConfidenceAvg.toFixed(4)),
  };

  if (metrics.lowSignalSpans.length) {
    summary.low_signal_spans = metrics.lowSignalSpans;
  }
  if (typeof metrics.repVelocityAvg === 'number') {
    summary.rep_velocity_avg = Number(metrics.repVelocityAvg.toFixed(3));
  }
  if (metrics.notes.length) {
    summary.notes = metrics.notes;
  }

  return {
    session_meta: {
      goal: 'strength',
      target_window: { min: 3, max: 5 },
      unit: 'normalized_rms',
    },
    set_summary: summary,
    constraints: {
      copy_style: 'human_trainer',
      lines: 2,
      line_max_chars: 140,
      rest_seconds_default: 120,
      rest_seconds_light: 90,
      ...overrides,
    },
  };
};

export const generateStrengthScenarios = (
  metrics: SetSummaryMetrics,
): WhatIfScenario[] => {
  const baseRest = metrics.zone === 'too_light' ? 90 : 120;
  const fatigueText =
    metrics.fatigueRep != null
      ? metrics.fatigueRep >= TARGET_RANGE.min && metrics.fatigueRep <= TARGET_RANGE.max
        ? `Fatigue landed at rep ${metrics.fatigueRep}.`
        : `Fatigue landed outside the ${TARGET_RANGE.min}-${TARGET_RANGE.max} window (rep ${metrics.fatigueRep}).`
      : 'Fatigue never landed in the target window.';
  const confidencePenalty = clamp((1 - metrics.signalConfidenceAvg) * 10, 0, 6);

  const mkScenario = (
    title: string,
    action: string,
    strengthDelta: number,
    readinessDelta: number,
    rationale: string,
  ): WhatIfScenario => ({
    title,
    action,
    strengthDeltaPct: Math.round((strengthDelta - confidencePenalty * 0.1) * 10) / 10,
    readinessDeltaPct: Math.round((readinessDelta - confidencePenalty * 0.1) * 10) / 10,
    rationale,
  });

  switch (metrics.zone) {
    case 'too_heavy_early':
      return [
        mkScenario(
          'Drop load 5% & extend rest',
          'Reduce bar weight ~5% and rest 150s before the next set.',
          2.8,
          4.2,
          `${fatigueText} Lower load keeps you in the goldilocks window.`,
        ),
        mkScenario(
          'Same load, longer rest',
          'Keep today’s load but rest 180s and hit clean reps 3–5.',
          1.9,
          3.5,
          'Extra rest lets phosphocreatine recharge so fatigue lands later.',
        ),
        mkScenario(
          'Tempo focus',
          'Maintain load, use a 3-1-1 tempo for the next set and cap at 4 reps.',
          1.4,
          2.0,
          'Tempo reins in bar speed and spreads fatigue across the set.',
        ),
      ];
    case 'too_light':
      return [
        mkScenario(
          'Add +1 rep',
          `Keep load; add +1 rep with ${baseRest}s recovery.`,
          2.4,
          -1.8,
          'One more clean rep should bring fatigue into window.',
        ),
        mkScenario(
          'Bump load +5%',
          'Increase load ~5%, hold rest at 120s, aim for fatigue at rep 4.',
          3.1,
          -2.2,
          'Heavier load raises recruitment to match the strength zone.',
        ),
        mkScenario(
          'Accessory finisher',
          'After 90s rest, add a split-squat finisher (8 reps/side).',
          1.6,
          -1.4,
          'Accessory work adds unilateral demand without overloading the main lift.',
        ),
      ];
    case 'low_signal':
      return [
        mkScenario(
          'Reseat sensor & retry',
          'Power down, dry sweat, reseat electrode, then repeat the set.',
          1.2,
          3.8,
          'Stable signal lets you trust the next fatigue read.',
        ),
        mkScenario(
          'Cable route adjustment',
          'Secure lead path away from knee travel before the next set.',
          0.9,
          2.5,
          'Cleaner cable routing reduces motion artifacts mid-set.',
        ),
        mkScenario(
          'Signal calibration set',
          'Do a 3-rep submax set after re-seat to confirm clean data.',
          1.0,
          3.0,
          'A short calibration set validates the fix before pushing load.',
        ),
      ];
    case 'in_zone':
      return [
        mkScenario(
          'Stay the course',
          `Repeat the same load/reps with ${baseRest}s between sets.`,
          0.8,
          -0.4,
          `${fatigueText} Keeping rhythm reinforces motor patterning.`,
        ),
        mkScenario(
          'Micro progression',
          `Add +1 rep if bar speed stays crisp; keep rest at ${baseRest}s.`,
          2.1,
          -2.6,
          'Small volume bump builds strength while staying controlled.',
        ),
        mkScenario(
          'Contrast set',
          'After 120s, add a lighter speed set (3 reps at -15% load).',
          1.7,
          -1.9,
          'Speed contrast primes the nervous system without deep fatigue.',
        ),
      ];
    case 'building':
    default:
      return [
        mkScenario(
          'Extend set to fatigue window',
          `Continue this exercise until fatigue lands between reps ${TARGET_RANGE.min}-${TARGET_RANGE.max}.`,
          1.8,
          -2.0,
          'You’re still building toward the window—stick with smooth reps.',
        ),
        mkScenario(
          'Short active rest',
          'Cycle 60s active rest (air squats or march) before the next set.',
          0.9,
          1.5,
          'Keeps readiness warm without overloading.',
        ),
        mkScenario(
          'Technique check',
          'Film the next set to confirm depth and bar path, cap at 5 reps.',
          1.1,
          -1.0,
          'Technique focus lets you add intensity confidently later.',
        ),
      ];
  }
};

const formatDelta = (value: number): string => {
  const rounded = Math.round(value * 10) / 10;
  if (rounded === 0) return '±0%';
  const prefix = rounded > 0 ? '+' : '';
  return `${prefix}${rounded}%`;
};

export const formatStrengthScenarios = (
  metrics: SetSummaryMetrics,
  scenarios: WhatIfScenario[],
  exerciseName?: string | null,
): string => {
  const exerciseLabel = exerciseName?.trim() || 'that set';
  const fatigueText =
    metrics.fatigueRep != null
      ? metrics.fatigueRep >= TARGET_RANGE.min && metrics.fatigueRep <= TARGET_RANGE.max
        ? `fatigue landed at rep ${metrics.fatigueRep}`
        : `fatigue landed at rep ${metrics.fatigueRep} (outside the ${TARGET_RANGE.min}-${TARGET_RANGE.max} window)`
      : 'fatigue never landed in the target window';
  const risePct = toPercent(metrics.totalRisePct);
  const confPct = toPercent(metrics.signalConfidenceAvg);

  const header = `Pulled your last ${exerciseLabel}: zone=${metrics.zone.replace(/_/g, ' ')}, ${fatigueText}, RMS rise ~${risePct}%, signal confidence ~${confPct}%.`;
  const intro = `Here are three strength-focused paths you can take next:`;
  const body = scenarios
    .map(
      (scenario, idx) =>
        `${idx + 1}. ${scenario.title} — ${scenario.action} (Strength ${formatDelta(
          scenario.strengthDeltaPct,
        )} | Readiness ${formatDelta(scenario.readinessDeltaPct)}). ${scenario.rationale}`,
    )
    .join('\n');
  const outro = `Pick the move that matches how you’re feeling—keep reps crisp and stop before it grinds.`;

  return [header, '', intro, body, '', outro].join('\n');
};

