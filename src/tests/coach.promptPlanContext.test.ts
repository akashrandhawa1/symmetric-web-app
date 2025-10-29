import { describe, it, expect } from 'vitest';
import { composeCoachPrompt } from '@/services';
import type { CoachPromptContextInput } from '@/services';

const baseContext: CoachPromptContextInput = {
  recoveryScore: 68,
  recoverySlopePerHr: null,
  strengthTrendWoW: null,
  timeToNextOptimalHours: null,
  nextOptimalLabel: null,
  timeSinceLastSessionHours: 48,
  symmetryIndex: 92,
  lastSession: {
    exercise: null,
    fatigueRep: null,
    peakedRep: null,
    symmetryNote: null,
    recentPR: null,
    recentSessions: [],
  },
  user: {
    goal: null,
    timezone: 'UTC',
    locale: 'en-US',
    userPrefs: {
      preferredDayparts: null,
      sessionLengthMin: null,
    },
    profile: null,
  },
  constraints: {
    todayBusyUntil: null,
    travel: null,
  },
  subjectives: {
    fatigueSelfReport: null,
    sleepHrs: null,
    soreness: null,
    stress: null,
    mood: null,
    timeAvailableMin: null,
  },
  ui: {
    ctaCandidate: 'Start readiness check',
    reduceMotion: false,
  },
  dataSyncOK: true,
  coachState: 'midRecovery',
};

describe('composeCoachPrompt current-plan context', () => {
  it('embeds the current plan summary when provided', () => {
    const context: CoachPromptContextInput = {
      ...baseContext,
      currentPlan: {
        intent: 'quad_strength',
        readinessBefore: 65,
        readinessAfter: 52,
        blocks: [
          {
            displayName: 'Front Squat',
            loadStrategy: 'heavy',
            sets: 4,
            reps: '4–6',
            focus: 'Main',
          },
          {
            displayName: 'Split Squat',
            loadStrategy: 'moderate',
            sets: 3,
            reps: '8/side',
            focus: 'Accessory',
          },
        ],
      },
    };

    const prompt = composeCoachPrompt({
      question: 'What is the plan for today?',
      history: [],
      sessionSummary: {},
      context,
      intent: 'plan_next',
      needsTiming: false,
    });

    expect(prompt).toContain('CURRENT_PLAN:');
    expect(prompt).toContain('block_1: Front Squat');
    expect(prompt).toContain('readiness_before: 65');
    expect(prompt).toContain('readiness_after: 52');
  });

  it('omits current plan section when no plan is present', () => {
    const prompt = composeCoachPrompt({
      question: 'What is the plan for today?',
      history: [],
      sessionSummary: {},
      context: { ...baseContext, currentPlan: null },
      intent: 'plan_next',
      needsTiming: false,
    });

    expect(prompt).not.toContain('CURRENT_PLAN:');
  });
});
