/**
 * Countdown timer hook for Rest Screen Coach.
 *
 * Provides a simple countdown timer with start, reset, and pause functionality.
 * Used to display rest period countdown on the rest screen.
 *
 * @module components/coach/useCountdown
 */

import { useState, useEffect, useCallback, useRef } from 'react';

export type UseCountdownReturn = {
  seconds: number;
  isRunning: boolean;
  start: () => void;
  pause: () => void;
  reset: (newSeconds?: number) => void;
  isComplete: boolean;
};

/**
 * Custom hook for managing countdown timer state.
 *
 * Features:
 * - Auto-starts countdown
 * - Pauses at 0 (does not go negative)
 * - Supports reset to new duration
 * - Exposes isComplete flag for pulsing UI affordances
 *
 * @param initialSeconds - Starting countdown value in seconds
 * @returns Countdown state and control functions
 *
 * @example
 * ```tsx
 * const { seconds, start, reset, isComplete } = useCountdown(90);
 *
 * return (
 *   <div>
 *     <div className={isComplete ? 'pulse' : ''}>{seconds}s</div>
 *     <button onClick={() => reset(120)}>Reset to 2min</button>
 *   </div>
 * );
 * ```
 */
export function useCountdown(initialSeconds: number): UseCountdownReturn {
  const [seconds, setSeconds] = useState(initialSeconds);
  const [isRunning, setIsRunning] = useState(false);
  const intervalRef = useRef<number | null>(null);

  const isComplete = seconds === 0;

  // Clear interval on unmount
  useEffect(() => {
    return () => {
      if (intervalRef.current !== null) {
        clearInterval(intervalRef.current);
      }
    };
  }, []);

  // Countdown logic
  useEffect(() => {
    if (isRunning && seconds > 0) {
      intervalRef.current = window.setInterval(() => {
        setSeconds((prev) => {
          if (prev <= 1) {
            setIsRunning(false);
            return 0;
          }
          return prev - 1;
        });
      }, 1000);
    } else {
      if (intervalRef.current !== null) {
        clearInterval(intervalRef.current);
        intervalRef.current = null;
      }
    }

    return () => {
      if (intervalRef.current !== null) {
        clearInterval(intervalRef.current);
      }
    };
  }, [isRunning, seconds]);

  const start = useCallback(() => {
    if (seconds > 0) {
      setIsRunning(true);
    }
  }, [seconds]);

  const pause = useCallback(() => {
    setIsRunning(false);
  }, []);

  const reset = useCallback((newSeconds?: number) => {
    setIsRunning(false);
    setSeconds(newSeconds ?? initialSeconds);
  }, [initialSeconds]);

  return {
    seconds,
    isRunning,
    start,
    pause,
    reset,
    isComplete,
  };
}
