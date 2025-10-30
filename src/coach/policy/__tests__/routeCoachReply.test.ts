/**
 * Unit tests for state-aware coaching router.
 *
 * Tests verify:
 * - Silent behavior on quiet surfaces
 * - Topic restrictions enforcement
 * - Word budget compliance
 * - Safety overrides
 * - Fallback behavior
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { routeCoachReply } from '../routeCoachReply';
import type { CoachSnapshot, LLMReply } from '../types';
import * as callLLMModule from '../../prompt/callLLM';

// Mock the callLLM module
vi.mock('../../prompt/callLLM', () => ({
  callLLM: vi.fn(),
}));

describe('routeCoachReply', () => {
  const mockCallLLM = vi.mocked(callLLMModule.callLLM);

  beforeEach(() => {
    mockCallLLM.mockReset();
  });

  describe('Silence behavior', () => {
    it('should stay silent on home surface when requiresChange=false', async () => {
      const snapshot: CoachSnapshot = {
        appSurface: 'home',
        experienceBand: 'intermediate',
        readiness_now: 75,
        readiness_target: 50,
        requiresChange: false,
        phase: 'planning',
        intent: 'report',
        utterance: 'What should I do?',
      };

      const result = await routeCoachReply(snapshot);

      expect(result.speak).toBe(false);
      expect(mockCallLLM).not.toHaveBeenCalled();
    });

    it('should speak on home surface when requiresChange=true', async () => {
      const snapshot: CoachSnapshot = {
        appSurface: 'home',
        experienceBand: 'intermediate',
        readiness_now: 75,
        readiness_target: 50,
        requiresChange: true,
        phase: 'planning',
        intent: 'ask',
        utterance: 'What should I do?',
      };

      mockCallLLM.mockResolvedValue({
        hook: 'Time to start.',
        why: 'You have plenty of readiness.',
        action: 'Begin with squats.',
        action_type: 'plan',
      });

      const result = await routeCoachReply(snapshot);

      expect(result.speak).toBe(true);
      expect(result.text).toBeTruthy();
      expect(mockCallLLM).toHaveBeenCalled();
    });

    it('should stay silent on rest_overlay when requiresChange=false', async () => {
      const snapshot: CoachSnapshot = {
        appSurface: 'rest_overlay',
        experienceBand: 'intermediate',
        readiness_now: 60,
        readiness_target: 50,
        requiresChange: false,
        phase: 'resting',
        intent: 'report',
        utterance: '',
      };

      const result = await routeCoachReply(snapshot);

      expect(result.speak).toBe(false);
    });

    it('should honor silent flag from LLM', async () => {
      const snapshot: CoachSnapshot = {
        appSurface: 'working_set',
        experienceBand: 'intermediate',
        readiness_now: 60,
        readiness_target: 50,
        requiresChange: false,
        phase: 'executing',
        intent: 'report',
        utterance: 'Just checking in.',
      };

      mockCallLLM.mockResolvedValue({
        silent: true,
      });

      const result = await routeCoachReply(snapshot);

      expect(result.speak).toBe(false);
    });
  });

  describe('Safety overrides', () => {
    it('should immediately respond to pain flag', async () => {
      const snapshot: CoachSnapshot = {
        appSurface: 'working_set',
        experienceBand: 'intermediate',
        readiness_now: 60,
        readiness_target: 50,
        requiresChange: false,
        phase: 'executing',
        safety: {
          pain_flag: true,
        },
        intent: 'struggle',
        utterance: 'My knee hurts.',
      };

      const result = await routeCoachReply(snapshot);

      expect(result.speak).toBe(true);
      expect(result.text).toContain('Stop');
      expect(result.text).toContain('pain');
      expect(mockCallLLM).not.toHaveBeenCalled();
    });
  });

  describe('Topic restrictions', () => {
    it('should use fallback when LLM suggests banned topic', async () => {
      const snapshot: CoachSnapshot = {
        appSurface: 'home',
        experienceBand: 'intermediate',
        readiness_now: 75,
        readiness_target: 50,
        requiresChange: true,
        phase: 'planning',
        intent: 'ask',
        utterance: 'How deep should I squat?',
      };

      // LLM tries to discuss depth (banned on home surface)
      mockCallLLM.mockResolvedValue({
        hook: 'Go deep.',
        why: 'Depth is critical.',
        action: 'Hit parallel or below.',
        action_type: 'depth',
      });

      const result = await routeCoachReply(snapshot);

      expect(result.speak).toBe(true);
      // Should use fallback because depth is banned on home
      expect(result.text).not.toContain('parallel');
    });

    it('should reject topics not in allowed list', async () => {
      const snapshot: CoachSnapshot = {
        appSurface: 'warmup',
        experienceBand: 'intermediate',
        readiness_now: 75,
        readiness_target: 50,
        requiresChange: false,
        phase: 'executing',
        intent: 'ask',
        utterance: 'Should I add weight?',
      };

      // LLM tries to discuss load (not allowed on warmup)
      mockCallLLM.mockResolvedValue({
        hook: 'Add 10 pounds.',
        why: 'You can handle it.',
        action: 'Load up now.',
        action_type: 'load',
      });

      const result = await routeCoachReply(snapshot);

      expect(result.speak).toBe(true);
      // Should use fallback because load not allowed on warmup
      expect(result.text).not.toContain('10 pounds');
    });

    it('should accept allowed topics', async () => {
      const snapshot: CoachSnapshot = {
        appSurface: 'working_set',
        experienceBand: 'intermediate',
        readiness_now: 60,
        readiness_target: 50,
        requiresChange: false,
        phase: 'executing',
        intent: 'ask',
        utterance: 'How many reps?',
      };

      mockCallLLM.mockResolvedValue({
        hook: 'Hit 5 reps.',
        why: 'Keep quality high.',
        action: 'Stop at 5 clean reps.',
        action_type: 'reps',
      });

      const result = await routeCoachReply(snapshot);

      expect(result.speak).toBe(true);
      expect(result.text).toContain('Hit 5 reps');
    });
  });

  describe('Word budget enforcement', () => {
    it('should trim response exceeding word budget', async () => {
      const snapshot: CoachSnapshot = {
        appSurface: 'working_set',
        experienceBand: 'intermediate',
        readiness_now: 60,
        readiness_target: 50,
        requiresChange: false,
        phase: 'executing',
        intent: 'ask',
        utterance: 'What next?',
      };

      // LLM returns response exceeding 18-word budget
      mockCallLLM.mockResolvedValue({
        hook: 'This is a very long hook sentence that goes on and on.',
        why: 'Because I want to explain everything in great detail here.',
        action: 'Do this specific thing right now without any delay whatsoever.',
        action_type: 'tempo',
      });

      const result = await routeCoachReply(snapshot);

      expect(result.speak).toBe(true);
      const wordCount = result.text!.split(' ').length;
      expect(wordCount).toBeLessThanOrEqual(18);
    });

    it('should respect experience band word budget (novice)', async () => {
      const snapshot: CoachSnapshot = {
        appSurface: 'working_set',
        experienceBand: 'novice',
        readiness_now: 60,
        readiness_target: 50,
        requiresChange: false,
        phase: 'executing',
        intent: 'ask',
        utterance: 'Help me.',
      };

      mockCallLLM.mockResolvedValue({
        hook: 'Slow down on the way down.',
        why: 'Control builds strength.',
        action: 'Count to 2 going down each rep.',
        action_type: 'tempo',
      });

      const result = await routeCoachReply(snapshot);

      expect(result.speak).toBe(true);
      const wordCount = result.text!.split(' ').length;
      // Novice gets 22-word budget
      expect(wordCount).toBeLessThanOrEqual(22);
    });

    it('should respect experience band word budget (advanced)', async () => {
      const snapshot: CoachSnapshot = {
        appSurface: 'working_set',
        experienceBand: 'advanced',
        readiness_now: 60,
        readiness_target: 50,
        requiresChange: false,
        phase: 'executing',
        intent: 'ask',
        utterance: 'Load?',
      };

      mockCallLLM.mockResolvedValue({
        hook: 'Add 5.',
        why: 'Speed is solid.',
        action: 'Keep reps at 3.',
        action_type: 'load',
      });

      const result = await routeCoachReply(snapshot);

      expect(result.speak).toBe(true);
      const wordCount = result.text!.split(' ').length;
      // Advanced gets 14-word budget
      expect(wordCount).toBeLessThanOrEqual(14);
    });
  });

  describe('Fallback behavior', () => {
    it('should use fallback when LLM call fails', async () => {
      const snapshot: CoachSnapshot = {
        appSurface: 'working_set',
        experienceBand: 'intermediate',
        readiness_now: 60,
        readiness_target: 50,
        requiresChange: false,
        phase: 'executing',
        intent: 'ask',
        utterance: 'What next?',
      };

      mockCallLLM.mockRejectedValue(new Error('API error'));

      const result = await routeCoachReply(snapshot);

      expect(result.speak).toBe(true);
      expect(result.text).toBeTruthy();
      expect(result.text).toContain('bottom'); // Fallback for execute_reps objective
    });

    it('should use fallback when LLM returns malformed response', async () => {
      const snapshot: CoachSnapshot = {
        appSurface: 'top_set',
        experienceBand: 'intermediate',
        readiness_now: 60,
        readiness_target: 50,
        requiresChange: false,
        phase: 'executing',
        intent: 'ask',
        utterance: 'Push or hold?',
      };

      // Missing required fields
      mockCallLLM.mockResolvedValue({
        hook: 'Go for it.',
        // Missing action and action_type
      } as any);

      const result = await routeCoachReply(snapshot);

      expect(result.speak).toBe(true);
      expect(result.text).toBeTruthy();
      expect(result.text).toContain('weight'); // Fallback for push_or_hold objective
    });
  });

  describe('Integration scenarios', () => {
    it('should handle top set push scenario', async () => {
      const snapshot: CoachSnapshot = {
        appSurface: 'top_set',
        experienceBand: 'intermediate',
        readiness_now: 65,
        readiness_target: 50,
        requiresChange: true,
        phase: 'executing',
        last_set: {
          exercise: 'Back Squat',
          weight_lb: 225,
          reps: 5,
          bar_speed: 'fast',
        },
        intent: 'brag',
        utterance: 'That felt easy!',
      };

      mockCallLLM.mockResolvedValue({
        hook: 'Bar speed is fast.',
        why: 'You have room to push.',
        action: 'Add 5 pounds next set.',
        action_type: 'load',
      });

      const result = await routeCoachReply(snapshot);

      expect(result.speak).toBe(true);
      expect(result.text).toContain('Bar speed');
      expect(result.text).toContain('Add 5 pounds');
    });

    it('should handle struggle with form cue', async () => {
      const snapshot: CoachSnapshot = {
        appSurface: 'working_set',
        experienceBand: 'intermediate',
        readiness_now: 55,
        readiness_target: 50,
        requiresChange: true,
        phase: 'executing',
        last_set: {
          exercise: 'Back Squat',
          weight_lb: 185,
          reps: 4,
          depth: 'above',
        },
        intent: 'struggle',
        utterance: 'That was hard.',
      };

      mockCallLLM.mockResolvedValue({
        hook: 'Depth broke.',
        why: 'Hit parallel.',
        action: 'Add a 2-second pause at bottom.',
        action_type: 'depth',
      });

      const result = await routeCoachReply(snapshot);

      expect(result.speak).toBe(true);
      expect(result.text).toBeTruthy();
    });
  });
});
