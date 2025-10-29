import { useSyncExternalStore } from 'react';

export type CoachContextPhase = 'intro' | 'warmup' | 'work' | 'rest' | 'cooldown' | 'summary';
export type CoachGoal = 'build_strength' | 'recovery';

export type CoachContext = {
  readiness: number;
  sessionPhase: CoachContextPhase;
  metrics?: {
    ror?: 'down' | 'stable' | 'up';
    symmetryPct?: number;
    rmsDropPct?: number;
  };
  lastSet?: {
    exercise: string;
    reps: number;
    rpe?: number;
    seconds?: number;
  };
  goal: CoachGoal;
  userFlags?: {
    tired?: boolean;
    pain?: boolean;
  };
};

export type CoachEventType =
  | 'phase_changed'
  | 'set_completed'
  | 'symmetry_updated'
  | 'readiness_updated'
  | 'user_override_tired'
  | 'user_override_pain'
  | 'context_refreshed';

export type CoachEvent<T extends CoachEventType = CoachEventType> = {
  type: T;
  at: number;
  payload?: Record<string, unknown>;
};

type Listener = () => void;

class CoachContextBusImpl {
  private snapshot: CoachContext = {
    readiness: 75,
    sessionPhase: 'intro',
    goal: 'build_strength',
  };

  private listeners: Set<Listener> = new Set();
  private events: CoachEvent[] = [];

  subscribe(listener: Listener): () => void {
    this.listeners.add(listener);
    return () => {
      this.listeners.delete(listener);
    };
  }

  getSnapshot(): CoachContext {
    return this.snapshot;
  }

  getEvents(): CoachEvent[] {
    return this.events;
  }

  publishContext(next: Partial<CoachContext>, eventPayload?: CoachEvent) {
    this.snapshot = {
      ...this.snapshot,
      ...next,
      metrics: {
        ...this.snapshot.metrics,
        ...next.metrics,
      },
      lastSet: next.lastSet ?? this.snapshot.lastSet,
      userFlags: {
        ...this.snapshot.userFlags,
        ...next.userFlags,
      },
    };

    if (eventPayload) {
      this.publish(eventPayload);
    } else {
      this.publish({ type: 'context_refreshed', at: Date.now(), payload: next });
    }
  }

  publish(event: CoachEvent) {
    this.events.push(event);
    if (this.events.length > 20) {
      this.events.splice(0, this.events.length - 20);
    }
    for (const listener of this.listeners) {
      listener();
    }
  }
}

export const CoachContextBus = new CoachContextBusImpl();

export function useCoachContext(): CoachContext {
  return useSyncExternalStore(
    (listener) => CoachContextBus.subscribe(listener),
    () => CoachContextBus.getSnapshot(),
    () => CoachContextBus.getSnapshot(),
  );
}

export function useCoachEvents(limit = 5): CoachEvent[] {
  const events = useSyncExternalStore(
    (listener) => CoachContextBus.subscribe(listener),
    () => CoachContextBus.getEvents(),
    () => CoachContextBus.getEvents(),
  );
  return events.slice(-limit);
}
