/**
 * Example usage of state-aware voice coaching system.
 *
 * This file demonstrates common integration patterns and usage scenarios.
 */

import { CoachContextBus } from '../CoachContextBus';
import { generateStateAwareCoachResponse } from './integration';
import type { CoachSnapshot } from './types';

/**
 * EXAMPLE 1: Basic integration with existing voice coach
 *
 * Replace free-form prompt generation with state-aware routing.
 */
export async function exampleBasicIntegration(userUtterance: string): Promise<string | null> {
  // Get current context from bus
  const ctx = CoachContextBus.getSnapshot();

  // Generate state-aware response
  const result = await generateStateAwareCoachResponse(ctx, userUtterance);

  // Return text if coach should speak, null otherwise
  return result.speak ? result.text! : null;
}

/**
 * EXAMPLE 2: Pre-flight check before enabling mic
 *
 * Disable mic button on surfaces where coach won't speak.
 */
export function exampleShouldEnableMic(): boolean {
  const ctx = CoachContextBus.getSnapshot();

  // Check if surface is quiet
  const quietSurfaces = ['home', 'rest_overlay', 'recovery_mode'];
  const surface = ctx.appSurface ?? 'home';

  // Enable mic only if change is required on quiet surfaces
  if (quietSurfaces.includes(surface)) {
    return ctx.requiresChange ?? false;
  }

  // Always enable mic on active surfaces
  return true;
}

/**
 * EXAMPLE 3: Update context after set completion
 *
 * Integrate with workout engine to update context and compute requiresChange.
 */
export function exampleUpdateAfterSet(
  exercise: string,
  weight: number,
  reps: number,
  barSpeed: 'slow' | 'stable' | 'fast',
  depth: 'above' | 'parallel' | 'below'
): void {
  // Update context with set data
  CoachContextBus.publishContext({
    lastSet: {
      exercise,
      weight_lb: weight,
      reps,
      bar_speed: barSpeed,
      depth,
      rpe: undefined,
      seconds: undefined,
      tempo: '2010', // Example tempo
    },
  });

  // Compute if coaching is needed
  // In a real integration, this would be called by the workout engine
  const ctx = CoachContextBus.getSnapshot();
  const requiresChange =
    barSpeed === 'fast' || // Room to push
    depth === 'above' || // Form breakdown
    barSpeed === 'slow'; // Struggling

  CoachContextBus.publishContext({ requiresChange });
}

/**
 * EXAMPLE 4: Screen-based surface updates
 *
 * Update appSurface as user navigates screens.
 */
export function exampleScreenNavigation(screen: string): void {
  let appSurface: CoachSnapshot['appSurface'] = 'home';

  switch (screen) {
    case 'home':
      appSurface = 'home';
      break;
    case 'pre-training':
      appSurface = 'pre_session';
      break;
    case 'warmup':
      appSurface = 'warmup';
      break;
    case 'workout-active':
      appSurface = 'working_set';
      break;
    case 'rest':
      appSurface = 'rest_overlay';
      break;
    case 'cooldown':
      appSurface = 'cooldown';
      break;
    case 'summary':
      appSurface = 'post_session';
      break;
  }

  CoachContextBus.publishContext({ appSurface });
}

/**
 * EXAMPLE 5: Experience band detection
 *
 * Set experience band based on user profile or workout history.
 */
export function exampleSetExperienceBand(totalSessions: number, maxSquatLbs: number): void {
  let experienceBand: CoachSnapshot['experienceBand'] = 'intermediate';

  if (totalSessions < 12 || maxSquatLbs < 135) {
    experienceBand = 'novice';
  } else if (totalSessions > 100 && maxSquatLbs > 315) {
    experienceBand = 'advanced';
  }

  CoachContextBus.publishContext({ experienceBand });
}

/**
 * EXAMPLE 6: Working with top sets
 *
 * Dynamically adjust surface based on set intensity.
 */
export function exampleTopSetDetection(
  currentWeight: number,
  maxWeight: number,
  setNumber: number
): void {
  const intensityPct = (currentWeight / maxWeight) * 100;

  let appSurface: CoachSnapshot['appSurface'] = 'working_set';

  if (intensityPct >= 90) {
    appSurface = 'top_set'; // Peak intensity
  } else if (intensityPct < 70 && setNumber > 3) {
    appSurface = 'backoff'; // Reduced load
  }

  CoachContextBus.publishContext({ appSurface });
}

/**
 * EXAMPLE 7: Safety flag handling
 *
 * Set pain flag from user input or sensor data.
 */
export function exampleHandlePainReport(hasPain: boolean): void {
  CoachContextBus.publishContext({
    userFlags: {
      pain: hasPain,
      tired: false,
    },
  });

  // Next coach response will be immediate safety override
}

/**
 * EXAMPLE 8: Symmetry monitoring
 *
 * Update symmetry data from force plate or depth sensors.
 */
export function exampleUpdateSymmetry(leftForce: number, rightForce: number): void {
  const total = leftForce + rightForce;
  const left_pct = (leftForce / total) * 100;
  const right_pct = (rightForce / total) * 100;

  CoachContextBus.publishContext({
    symmetry: { left_pct, right_pct },
  });

  // Check if imbalance is significant
  const imbalance = Math.abs(left_pct - right_pct);
  const requiresChange = imbalance > 12;

  CoachContextBus.publishContext({ requiresChange });
}

/**
 * EXAMPLE 9: Complete voice coach integration
 *
 * Full example showing how to replace existing voice coach logic.
 */
export async function exampleCompleteVoiceCoachHandler(
  userUtterance: string,
  onSpeak: (text: string) => void,
  onSilent: () => void
): Promise<void> {
  try {
    const ctx = CoachContextBus.getSnapshot();
    const result = await generateStateAwareCoachResponse(ctx, userUtterance);

    if (result.speak && result.text) {
      // Log for debugging
      console.log('[Coach] Speaking:', result.text);
      console.log('[Coach] Raw reply:', result.raw);

      // Deliver via TTS
      onSpeak(result.text);
    } else {
      console.log('[Coach] Staying silent - no change needed');
      onSilent();
    }
  } catch (error) {
    console.error('[Coach] Error generating response:', error);

    // Fallback to safe message
    onSpeak('Keep reps clean; stop once quality drops.');
  }
}

/**
 * EXAMPLE 10: Readiness budget management
 *
 * Set target readiness and monitor current level.
 */
export function exampleReadinessBudgetTracking(
  currentReadiness: number,
  targetReadiness: number = 50
): void {
  CoachContextBus.publishContext({
    readiness: currentReadiness,
    readinessTarget: targetReadiness,
  });

  // Check if nearing target
  const nearTarget = currentReadiness <= targetReadiness + 4;
  const overTarget = currentReadiness < targetReadiness - 5;

  if (overTarget) {
    // Signal coach to protect budget
    CoachContextBus.publishContext({ requiresChange: true });
  }
}
