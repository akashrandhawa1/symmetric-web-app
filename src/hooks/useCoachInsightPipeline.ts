import { useCallback, useRef, useState } from 'react';
import type { MutableRefObject } from 'react';
import type { CoachInsightOrchestrator, CoachInsightContext, CoachInsight } from '../lib/coach/LlmOrchestrator';
import { composeCoachMessage, CoachMessageEnvelope, CoachMessageTier } from '../lib/coach/CoachMessageComposer';

export type CoachInsightStatus = 'idle' | 'pending' | 'skeleton' | 'ready';

interface CoachInsightViewState {
  status: CoachInsightStatus;
  envelope: CoachMessageEnvelope | null;
}

interface UseCoachInsightPipelineArgs {
  orchestratorRef: MutableRefObject<CoachInsightOrchestrator | null>;
  enabled: boolean;
}

interface RequestCoachInsightArgs {
  context: CoachInsightContext | null;
  reason: 'state' | 'checkpoint' | 'prefailure';
  tier: CoachMessageTier;
  fallback?: CoachInsight | null;
}

const SKELETON_DELAY_MS = 600;

export function useCoachInsightPipeline({ orchestratorRef, enabled }: UseCoachInsightPipelineArgs) {
  const [viewState, setViewState] = useState<CoachInsightViewState>({ status: 'idle', envelope: null });
  const requestIdRef = useRef(0);
  const messageIdRef = useRef(0);
  const inflightControllerRef = useRef<AbortController | null>(null);
  const skeletonTimerRef = useRef<number | null>(null);
  const activeTierRef = useRef<CoachMessageTier>('in_set');

  const clearTimers = useCallback(() => {
    if (skeletonTimerRef.current != null) {
      window.clearTimeout(skeletonTimerRef.current);
      skeletonTimerRef.current = null;
    }
  }, []);

  const clear = useCallback(() => {
    requestIdRef.current += 1;
    inflightControllerRef.current?.abort();
    inflightControllerRef.current = null;
    clearTimers();
    setViewState({ status: 'idle', envelope: null });
  }, [clearTimers]);

  const commitEnvelope = useCallback(
    (insight: CoachInsight, requestId: number) => {
      if (requestId !== requestIdRef.current) return;
      const tier = activeTierRef.current;
      const nextMessageId = String(++messageIdRef.current);
      const envelope = composeCoachMessage({ insight, tier, id: nextMessageId });
      setViewState({ status: 'ready', envelope });
    },
    [],
  );

  const handleFallbackCommit = useCallback(
    (fallback: CoachInsight | null | undefined, requestId: number) => {
      if (!fallback) {
        if (requestId === requestIdRef.current) {
          setViewState({ status: 'idle', envelope: null });
        }
        return;
      }
      commitEnvelope(fallback, requestId);
    },
    [commitEnvelope],
  );

  const requestInsight = useCallback(
    ({ context, reason, tier, fallback }: RequestCoachInsightArgs) => {
      const orchestrator = orchestratorRef.current;
      const nextRequestId = requestIdRef.current + 1;
      requestIdRef.current = nextRequestId;
      activeTierRef.current = tier;

      inflightControllerRef.current?.abort();
      inflightControllerRef.current = null;
      clearTimers();

      if (!enabled || !orchestrator || !context) {
        handleFallbackCommit(fallback, nextRequestId);
        return;
      }

      const controller = new AbortController();
      inflightControllerRef.current = controller;
      setViewState({ status: 'pending', envelope: null });

      skeletonTimerRef.current = window.setTimeout(() => {
        if (nextRequestId === requestIdRef.current) {
          setViewState({ status: 'skeleton', envelope: null });
        }
      }, SKELETON_DELAY_MS);

      const finalize = () => {
        if (inflightControllerRef.current === controller) {
          inflightControllerRef.current = null;
        }
        clearTimers();
      };

      orchestrator
        .generateInsight(context, reason, { signal: controller.signal })
        .then((insight) => {
          if (controller.signal.aborted || nextRequestId !== requestIdRef.current) {
            return;
          }
          if (!insight) {
            handleFallbackCommit(fallback, nextRequestId);
            return;
          }
          commitEnvelope(insight, nextRequestId);
        })
        .catch((error: any) => {
          if (controller.signal.aborted || nextRequestId !== requestIdRef.current) {
            return;
          }
          if (error?.name === 'AbortError') {
            return;
          }
          handleFallbackCommit(fallback, nextRequestId);
        })
        .finally(finalize);
    },
    [clearTimers, commitEnvelope, enabled, handleFallbackCommit, orchestratorRef],
  );

  return {
    state: viewState,
    requestInsight,
    clear,
  };
}
