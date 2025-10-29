import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import DropStack from '@/components/notify/DropStack';
import RestCoach, { type RestCoachAction } from '@/components/coach/RestCoach';
import { useCoachDrop } from '@/hooks/useCoachDrop';
import { makeRmsSetV2 } from '@/lib/sim/emgSimulator';
import type { RepFeature } from '@/lib/fatigue/types';
import { determineZone, findFatigueRep } from '@/lib/fatigue/engine';
import type { Zone } from '@/lib/fatigue/types';
import { primaryLine, secondaryLine, whyLine } from '@/lib/coach/tone';
import type { Scenario, SetSimOptions } from '@/lib/sim/emgSimulator';
import { TARGET_RANGE } from '@/lib/fatigue/thresholds';

type TelemetryEvent =
  | { type: 'zone_change'; from: Zone | ''; to: Zone; at_rep: number }
  | { type: 'coach_advice_shown'; zone: Zone; fatigue_rep: number | null }
  | { type: 'coach_user_decision'; decision: RestCoachAction };

const scenarioOptions: Scenario[] = ['just_right', 'early_heavy', 'too_light', 'low_signal'];

const buildOptions = (scenario: Scenario): SetSimOptions => {
  const base: SetSimOptions = {
    scenario,
    repsTarget: 18,
    targetRange: TARGET_RANGE,
  };

  if (scenario === 'low_signal') {
    base.forceLowSignalWindows = [{ from: 5, to: 7, confidence: 0.45 }];
  }

  if (scenario === 'too_light') {
    base.effortStep = 0.02;
  }

  if (scenario === 'early_heavy') {
    base.failureTriggerFatigue = 0.74;
  }

  return base;
};

const useTelemetry = () => {
  const emit = useCallback((event: TelemetryEvent) => {
    // Replace with analytics bridge as needed
    console.info('[telemetry]', event);
  }, []);
  return emit;
};

const rmsRise = (baseline: number, current: number): number => (current - baseline) / Math.max(1e-6, baseline);

export default function DemoCoach() {
  const [scenario, setScenario] = useState<Scenario>('just_right');
  const [reps, setReps] = useState<RepFeature[]>([]);
  const [isStreaming, setIsStreaming] = useState(false);
  const [restCoach, setRestCoach] = useState<{ zone: Zone; fatigueRep: number | null; seconds: number; why: string } | null>(null);
  const planRef = useRef<RepFeature[]>([]);
  const nextRepIndexRef = useRef(0);
  const zoneRef = useRef<Zone | ''>('');
  const emit = useTelemetry();
  const { notes, pushForZone, dismiss, reset: resetDrops } = useCoachDrop();

  const ensurePlan = useCallback(
    (targetScenario: Scenario) => {
      planRef.current = makeRmsSetV2(buildOptions(targetScenario));
      nextRepIndexRef.current = 0;
    },
    [],
  );

  useEffect(() => {
    ensurePlan(scenario);
    setReps([]);
    setIsStreaming(false);
    setRestCoach(null);
    resetDrops();
    zoneRef.current = '';
  }, [scenario, ensurePlan, resetDrops]);

  const pushNextRep = useCallback(() => {
    const plan = planRef.current;
    const idx = nextRepIndexRef.current;
    if (idx >= plan.length) {
      setIsStreaming(false);
      return;
    }
    const nextRep = plan[idx];
    nextRepIndexRef.current = idx + 1;

    setReps((prev) => {
      const next = [...prev, nextRep];
      const zone = determineZone(next);
      const baseline = next[0]?.rmsNorm ?? nextRep.rmsNorm;
      const last = next[next.length - 1];
      const prevVal = next.length >= 2 ? next[next.length - 2].rmsNorm : last.rmsNorm;
      const totalRise = rmsRise(baseline, last.rmsNorm);
      const slope = rmsRise(prevVal, last.rmsNorm);
      const body = whyLine(zone, { totalRisePct: totalRise, slopePctPerRep: slope });
      pushForZone(zone, body || undefined);

      if (zoneRef.current !== zone) {
        emit({ type: 'zone_change', from: zoneRef.current, to: zone, at_rep: last.idx });
        zoneRef.current = zone;
      }
      return next;
    });
  }, [emit, pushForZone]);

  useEffect(() => {
    if (!isStreaming) return undefined;
    const id = setInterval(() => {
      pushNextRep();
    }, 900);
    return () => clearInterval(id);
  }, [isStreaming, pushNextRep]);

  const handleStart = useCallback(() => {
    if (reps.length === 0 && nextRepIndexRef.current === 0) {
      pushNextRep();
    }
    setIsStreaming(true);
  }, [reps.length, pushNextRep]);

  const handlePause = useCallback(() => {
    setIsStreaming(false);
  }, []);

  const resetSet = useCallback(() => {
    ensurePlan(scenario);
    setReps([]);
    setRestCoach(null);
    zoneRef.current = '';
    resetDrops();
  }, [ensurePlan, scenario, resetDrops]);

  const handleEndSet = useCallback(() => {
    setIsStreaming(false);
    if (reps.length === 0) return;
    const zone = determineZone(reps);
    const fatigueRep = findFatigueRep(reps);
    const baseline = reps[0]?.rmsNorm ?? 1;
    const last = reps[reps.length - 1];
    const prevVal = reps.length >= 2 ? reps[reps.length - 2].rmsNorm : last.rmsNorm;
    const totalRise = rmsRise(baseline, last.rmsNorm);
    const slope = rmsRise(prevVal, last.rmsNorm);
    const why = whyLine(zone, { totalRisePct: totalRise, slopePctPerRep: slope });

    emit({ type: 'coach_advice_shown', zone, fatigue_rep: fatigueRep });

    setRestCoach({
      zone,
      fatigueRep,
      seconds: zone === 'too_light' ? 60 : 90,
      why,
    });
  }, [emit, reps]);

  const handleRestAction = useCallback(
    (action: RestCoachAction) => {
      emit({ type: 'coach_user_decision', decision: action });
      if (action === 'did') {
        resetSet();
      }
    },
    [emit, resetSet],
  );

  const liveZone = useMemo<Zone>(() => determineZone(reps), [reps]);

  return (
    <div className="min-h-screen w-full bg-gradient-to-br from-slate-950 via-slate-900 to-slate-950 text-white">
      <DropStack notes={notes} onDismiss={dismiss} />

      <div className="mx-auto flex w-full max-w-3xl flex-col gap-6 px-4 py-8">
        <header className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <h1 className="text-2xl font-semibold">RMS Coach Demo</h1>
          <div className="flex items-center gap-3">
            <label className="text-sm text-neutral-400">
              Scenario
              <select
                value={scenario}
                onChange={(event) => setScenario(event.target.value as Scenario)}
                className="ml-2 rounded-lg border border-white/10 bg-transparent px-3 py-1 text-sm focus:border-white/40 focus:outline-none"
              >
                {scenarioOptions.map((opt) => (
                  <option key={opt} value={opt} className="bg-slate-900 text-white">
                    {opt.replace(/_/g, ' ')}
                  </option>
                ))}
              </select>
            </label>
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={handleStart}
                className="rounded-lg bg-emerald-500 px-3 py-1 text-sm font-medium text-emerald-950 hover:bg-emerald-400"
              >
                Start
              </button>
              <button
                type="button"
                onClick={handlePause}
                className="rounded-lg border border-white/15 px-3 py-1 text-sm text-white hover:border-white/35"
              >
                Pause
              </button>
              <button
                type="button"
                onClick={pushNextRep}
                className="rounded-lg border border-white/15 px-3 py-1 text-sm text-white hover:border-white/35"
              >
                Step rep
              </button>
              <button
                type="button"
                onClick={handleEndSet}
                className="rounded-lg border border-white/15 px-3 py-1 text-sm text-white hover:border-white/35"
              >
                End set
              </button>
              <button
                type="button"
                onClick={resetSet}
                className="rounded-lg border border-white/15 px-3 py-1 text-sm text-white hover:border-white/35"
              >
                Reset
              </button>
            </div>
          </div>
        </header>

        <section className="rounded-3xl border border-white/10 bg-black/30 p-6 shadow-inner">
          <div className="flex items-baseline justify-between">
            <div>
              <div className="text-sm uppercase tracking-wide text-neutral-400">Live zone</div>
              <div className="text-2xl font-semibold">{liveZone.replace(/_/g, ' ')}</div>
            </div>
            <div className="text-sm text-neutral-400">
              Reps streamed: <span className="font-semibold text-white">{reps.length}</span>
            </div>
          </div>
          <div className="mt-4 grid grid-cols-4 gap-2 text-xs text-neutral-300">
            {reps.map((rep) => (
              <div
                key={rep.idx}
                className="rounded-lg border border-white/10 bg-white/5 px-2 py-2 text-center"
              >
                <div className="font-semibold text-white">#{rep.idx}</div>
                <div>{(rep.rmsNorm * 100).toFixed(0)}%</div>
                <div className="text-[10px] text-neutral-500">
                  conf {(rep.signalConfidence * 100).toFixed(0)}%
                </div>
              </div>
            ))}
            {reps.length === 0 && <div className="text-sm text-neutral-500">No reps yet.</div>}
          </div>
        </section>

        {restCoach ? (
          <section className="space-y-3">
            <RestCoach
              primary={primaryLine(restCoach.zone)}
              secondary={secondaryLine(restCoach.zone)}
              seconds={restCoach.seconds}
              onAction={handleRestAction}
            />
            {restCoach.why ? (
              <div className="rounded-xl border border-white/10 bg-black/30 p-3 text-xs text-neutral-300">
                <span className="font-semibold text-white">Why:</span> {restCoach.why}
                {restCoach.fatigueRep ? (
                  <div className="mt-1">Fatigue landed at rep {restCoach.fatigueRep}.</div>
                ) : null}
              </div>
            ) : null}
          </section>
        ) : null}
      </div>
    </div>
  );
}

