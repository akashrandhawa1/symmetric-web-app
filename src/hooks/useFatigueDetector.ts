import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  FatigueDetector,
  FatigueDetectorConfig,
  defaultFatigueConfig,
  FatigueState,
  FatigueStateEvent,
  FatigueDebugEvent,
} from '../lib/fatigue/FatigueDetector';

export interface UseFatigueDetectorOptions {
  config?: Partial<FatigueDetectorConfig>;
  onStateEvent?: (event: FatigueStateEvent) => void;
  onDebugEvent?: (event: FatigueDebugEvent) => void;
}

export interface UseFatigueDetectorResult {
  state: FatigueState | null;
  confidence: number;
  detector: FatigueDetector;
  update: (params: { nowSec: number; rmsNorm: number; mdfNorm?: number | null }) => void;
  reset: () => void;
  timeInState: (nowSec: number) => number;
}

export function useFatigueDetector(options?: UseFatigueDetectorOptions): UseFatigueDetectorResult {
  const { config, onStateEvent, onDebugEvent } = options ?? {};

  const detectorRef = useRef<FatigueDetector>();
  if (!detectorRef.current) {
    detectorRef.current = new FatigueDetector({ ...defaultFatigueConfig, ...config });
  }
  const detector = detectorRef.current;

  const [state, setState] = useState<FatigueState | null>(detector.getState());
  const [confidence, setConfidence] = useState(0);

  useEffect(() => {
    const unsubState = detector.onState((event) => {
      setState(event.state);
      setConfidence(event.confidence);
      onStateEvent?.(event);
    });
    const unsubDebug = onDebugEvent ? detector.onDebug(onDebugEvent) : undefined;
    return () => {
      unsubState();
      unsubDebug?.();
    };
  }, [detector, onStateEvent, onDebugEvent]);

  const update = useCallback(
    (params: { nowSec: number; rmsNorm: number; mdfNorm?: number | null }) => detector.update(params),
    [detector],
  );

  const reset = useCallback(() => {
    detector.reset();
    setState(null);
    setConfidence(0);
  }, [detector]);

  const timeInState = useCallback(
    (nowSec: number) => detector.getTimeInState(nowSec),
    [detector],
  );

  return useMemo(
    () => ({
      state,
      confidence,
      detector,
      update,
      reset,
      timeInState,
    }),
    [state, confidence, detector, update, reset, timeInState],
  );
}
