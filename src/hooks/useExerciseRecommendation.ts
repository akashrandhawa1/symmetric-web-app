/**
 * Exercise Recommendation Hook
 *
 * React hook for fetching and managing exercise recommendations from Gemini API.
 *
 * @module hooks/useExerciseRecommendation
 */

import { useState, useCallback, useRef } from 'react';
import {
  fetchExerciseRecommendation,
  getFallbackRecommendation,
  type ExerciseRecommendation,
  type EMGDataInput,
  type UserContext,
} from '../services/exerciseRecommendation';

export type UseExerciseRecommendationResult = {
  /** Current recommendation (null if not fetched yet) */
  recommendation: ExerciseRecommendation | null;
  /** True while fetching */
  isLoading: boolean;
  /** Error message if fetch failed */
  error: string | null;
  /** True if using fallback recommendation */
  isFallback: boolean;
  /** Fetch recommendation based on EMG data and context */
  fetchRecommendation: (emgData: EMGDataInput, userContext: UserContext) => Promise<void>;
  /** Clear current recommendation */
  clear: () => void;
};

/**
 * Hook to fetch exercise recommendations based on EMG data.
 *
 * @returns Recommendation state and fetch function
 *
 * @example
 * ```typescript
 * const { recommendation, isLoading, fetchRecommendation } = useExerciseRecommendation();
 *
 * // After set completion
 * await fetchRecommendation(
 *   {
 *     peakRmsPctMvc: 82,
 *     rateOfRiseMs: 450,
 *     symmetryPct: 92,
 *   },
 *   {
 *     readinessScore: 75,
 *     currentExercise: 'back_squat',
 *     setsCompleted: 3,
 *   }
 * );
 * ```
 */
export function useExerciseRecommendation(): UseExerciseRecommendationResult {
  const [recommendation, setRecommendation] = useState<ExerciseRecommendation | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isFallback, setIsFallback] = useState(false);
  const abortControllerRef = useRef<AbortController | null>(null);

  const fetchRecommendation = useCallback(async (emgData: EMGDataInput, userContext: UserContext) => {
    // Cancel previous request if still in flight
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
    }

    abortControllerRef.current = new AbortController();
    setIsLoading(true);
    setError(null);
    setIsFallback(false);

    try {
      const rec = await fetchExerciseRecommendation(emgData, userContext, {
        signal: abortControllerRef.current.signal,
      });

      if (!abortControllerRef.current.signal.aborted) {
        setRecommendation(rec);
        setIsFallback(false);
      }
    } catch (err: any) {
      if (err.name === 'AbortError') {
        return; // Request was cancelled, don't update state
      }

      console.warn('[useExerciseRecommendation] Gemini API failed, using fallback:', err.message);

      // Use fallback recommendation
      const fallback = getFallbackRecommendation(emgData, userContext);
      if (!abortControllerRef.current.signal.aborted) {
        setRecommendation(fallback);
        setIsFallback(true);
        setError('Using local recommendation logic (Gemini API unavailable)');
      }
    } finally {
      if (abortControllerRef.current && !abortControllerRef.current.signal.aborted) {
        setIsLoading(false);
      }
    }
  }, []);

  const clear = useCallback(() => {
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
    }
    setRecommendation(null);
    setError(null);
    setIsFallback(false);
  }, []);

  return {
    recommendation,
    isLoading,
    error,
    isFallback,
    fetchRecommendation,
    clear,
  };
}
