import { useMemo } from 'react';
import {
  estimateRecovery,
  whatIf,
  type Profile,
  type SessionFeatures,
  type EMG,
} from '../lib/recovery';

/**
 * React helper for recovery estimates and a simple "add one set" scenario.
 */
export function useRecovery(p: Profile, s: SessionFeatures, emg: EMG) {
  const est = useMemo(() => estimateRecovery(p, s, emg), [p, s, emg]);

  const addOneSet = useMemo(() => {
    return whatIf(p, s, emg, { setsTotal: s.setsTotal + 1 });
  }, [p, s, emg]);

  return { est, addOneSet };
}
