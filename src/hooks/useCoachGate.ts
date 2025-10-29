import { useMemo } from 'react';

export type SessionPhase = 'idle' | 'rest' | 'active';
export type CoachGateContext = {
  route: 'home' | 'home-live' | 'rest' | 'active' | 'history' | 'other';
  phase: SessionPhase;
};
export type CoachGate = {
  canOpen: boolean;
  reason?: string;
  trigger: 'pill' | 'mic' | 'dj' | 'none';
};

export function useCoachGate(ctx: CoachGateContext): CoachGate {
  return useMemo(() => {
    if (ctx.phase === 'active') return { canOpen: false, reason: 'active_set', trigger: 'none' };
    switch (ctx.route) {
      case 'home':
      case 'home-live':
        return { canOpen: true, trigger: 'dj' };
      case 'rest':
        return { canOpen: ctx.phase === 'rest', trigger: 'mic' };
      case 'history':
        return { canOpen: ctx.phase === 'idle', trigger: 'pill' };
      default:
        return { canOpen: false, reason: 'not_allowed', trigger: 'none' };
    }
  }, [ctx]);
}
