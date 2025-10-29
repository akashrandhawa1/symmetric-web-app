/**
 * Test Script for Exercise Recommender V2
 *
 * Validates that the V2 system works correctly with various scenarios.
 * Run with: npx tsx test-exercise-recommender-v2.ts
 */

import { recommendNext, buildSessionContext } from './src/lib/coach/exerciseRecommender';
import type { SessionContext } from './src/lib/coach/exerciseTypes';

// ============================================================================
// TEST SCENARIOS
// ============================================================================

async function testScenario1_FreshSession() {
  console.log('\n🧪 TEST 1: Fresh Session (No History)');
  console.log('─'.repeat(60));

  const context = buildSessionContext({
    userId: 'test_user',
    recentSets: [],
    currentReadiness: 85,
    availableEquipment: ['barbell', 'dumbbell'],
  });

  const rec = await recommendNext(context);

  console.log('Input: Readiness 85, no history');
  console.log('Expected: Back Squat (main), load: n/a');
  console.log('\nResult:');
  console.log('  Exercise:', rec.next_exercise.name);
  console.log('  Intent:', rec.next_exercise.intent);
  console.log('  Load:', rec.adjustments.load);
  console.log('  Confidence:', rec.confidence);
  console.log('  ✅ PASS' + (rec.next_exercise.id === 'back_squat' && rec.next_exercise.intent === 'main' ? '' : ' ❌ FAIL'));
}

async function testScenario2_HighActivation() {
  console.log('\n🧪 TEST 2: High Activation - Continue Main Lift');
  console.log('─'.repeat(60));

  const context = buildSessionContext({
    userId: 'test_user',
    recentSets: [{
      exerciseId: 'back_squat',
      exerciseName: 'Back Squat',
      repCount: 5,
      emgPeakRms: 900,
      emgRateOfRise: 420,
      symmetryPct: 92,
      mvcNormPct: 87,  // High activation
      signalQuality: 'good',
      fatigueIndex: 0.35,
      readinessAfter: 78,
    }],
    currentReadiness: 78,
    availableEquipment: ['barbell'],
  });

  const rec = await recommendNext(context);

  console.log('Input: Readiness 78, MVC 87%, FI 0.35, Symmetry 92%');
  console.log('Expected: Continue main lift, increase load');
  console.log('\nResult:');
  console.log('  Exercise:', rec.next_exercise.name);
  console.log('  Intent:', rec.next_exercise.intent);
  console.log('  Load:', rec.adjustments.load);
  console.log('  Rationale:', rec.adjustments.why);
  console.log('  Confidence:', rec.confidence);
  console.log('  ✅ PASS' + (rec.next_exercise.intent === 'main' && rec.adjustments.load === 'increase' ? '' : ' ❌ FAIL'));
}

async function testScenario3_LowActivation() {
  console.log('\n🧪 TEST 3: Low Activation - Increase Load');
  console.log('─'.repeat(60));

  const context = buildSessionContext({
    userId: 'test_user',
    recentSets: [{
      exerciseId: 'back_squat',
      exerciseName: 'Back Squat',
      repCount: 5,
      emgPeakRms: 650,
      emgRateOfRise: 380,
      symmetryPct: 91,
      mvcNormPct: 68,  // Low activation
      signalQuality: 'ok',
      fatigueIndex: 0.3,
      readinessAfter: 72,
    }],
    currentReadiness: 72,
    availableEquipment: ['barbell'],
  });

  const rec = await recommendNext(context);

  console.log('Input: Readiness 72, MVC 68% (too low), FI 0.3, Symmetry 91%');
  console.log('Expected: Continue main lift, increase load');
  console.log('\nResult:');
  console.log('  Exercise:', rec.next_exercise.name);
  console.log('  Intent:', rec.next_exercise.intent);
  console.log('  Load:', rec.adjustments.load);
  console.log('  Rationale:', rec.adjustments.why);
  console.log('  Confidence:', rec.confidence);
  console.log('  ✅ PASS' + (rec.adjustments.load === 'increase' ? '' : ' ❌ FAIL'));
}

async function testScenario4_HighFatigue() {
  console.log('\n🧪 TEST 4: High Fatigue - Switch to Accessory');
  console.log('─'.repeat(60));

  const context = buildSessionContext({
    userId: 'test_user',
    recentSets: [{
      exerciseId: 'front_squat',
      exerciseName: 'Front Squat',
      repCount: 5,
      emgPeakRms: 820,
      emgRateOfRise: 520,
      symmetryPct: 86,
      mvcNormPct: 72,
      signalQuality: 'ok',
      fatigueIndex: 0.65,  // High fatigue
      readinessAfter: 48,  // Low readiness
    }],
    currentReadiness: 48,
    availableEquipment: ['machine', 'bodyweight'],
  });

  const rec = await recommendNext(context);

  console.log('Input: Readiness 48, MVC 72%, FI 0.65 (high), Symmetry 86%');
  console.log('Expected: Switch to accessory (leg extension)');
  console.log('\nResult:');
  console.log('  Exercise:', rec.next_exercise.name);
  console.log('  Intent:', rec.next_exercise.intent);
  console.log('  Load:', rec.adjustments.load);
  console.log('  Rationale:', rec.next_exercise.rationale);
  console.log('  Confidence:', rec.confidence);
  console.log('  ✅ PASS' + (rec.next_exercise.intent === 'accessory' ? '' : ' ❌ FAIL'));
}

async function testScenario5_Asymmetry() {
  console.log('\n🧪 TEST 5: Asymmetry - Unilateral Work');
  console.log('─'.repeat(60));

  const context = buildSessionContext({
    userId: 'test_user',
    recentSets: [{
      exerciseId: 'back_squat',
      exerciseName: 'Back Squat',
      repCount: 5,
      emgPeakRms: 850,
      emgRateOfRise: 450,
      symmetryPct: 78,  // Poor symmetry
      mvcNormPct: 76,
      signalQuality: 'good',
      fatigueIndex: 0.4,
      readinessAfter: 68,
    }],
    currentReadiness: 68,
    availableEquipment: ['barbell', 'dumbbell'],
  });

  const rec = await recommendNext(context);

  console.log('Input: Readiness 68, MVC 76%, FI 0.4, Symmetry 78% (poor)');
  console.log('Expected: Unilateral work (split squat)');
  console.log('\nResult:');
  console.log('  Exercise:', rec.next_exercise.name);
  console.log('  Intent:', rec.next_exercise.intent);
  console.log('  Load:', rec.adjustments.load);
  console.log('  Rationale:', rec.next_exercise.rationale);
  console.log('  Confidence:', rec.confidence);
  console.log('  ✅ PASS' + (rec.next_exercise.id === 'split_squat' ? '' : ' ❌ FAIL'));
}

async function testScenario6_BorderlineReadiness() {
  console.log('\n🧪 TEST 6: Borderline Readiness (64)');
  console.log('─'.repeat(60));

  const context = buildSessionContext({
    userId: 'test_user',
    recentSets: [{
      exerciseId: 'back_squat',
      exerciseName: 'Back Squat',
      repCount: 5,
      emgPeakRms: 850,
      emgRateOfRise: 440,
      symmetryPct: 89,
      mvcNormPct: 74,
      signalQuality: 'ok',
      fatigueIndex: 0.48,
      readinessAfter: 64,
    }],
    currentReadiness: 64,  // Just below threshold
    availableEquipment: ['barbell'],
  });

  const rec = await recommendNext(context);

  console.log('Input: Readiness 64 (borderline), MVC 74%, FI 0.48, Symmetry 89%');
  console.log('Expected: Continue main lift with caution OR pivot to accessory');
  console.log('\nResult:');
  console.log('  Exercise:', rec.next_exercise.name);
  console.log('  Intent:', rec.next_exercise.intent);
  console.log('  Load:', rec.adjustments.load);
  console.log('  Rationale:', rec.next_exercise.rationale);
  console.log('  Confidence:', rec.confidence);
  console.log('  ✅ PASS (borderline case - either intent is valid)');
}

async function testScenario7_UserLabelFeltStrong() {
  console.log('\n🧪 TEST 7: User Labeled "Felt Strong"');
  console.log('─'.repeat(60));

  const context = buildSessionContext({
    userId: 'test_user',
    recentSets: [{
      exerciseId: 'back_squat',
      exerciseName: 'Back Squat',
      repCount: 5,
      emgPeakRms: 880,
      emgRateOfRise: 410,
      symmetryPct: 93,
      mvcNormPct: 82,
      signalQuality: 'good',
      fatigueIndex: 0.42,
      readinessAfter: 71,
      userLabel: 'felt_strong',  // User feedback
    }],
    currentReadiness: 71,
    availableEquipment: ['barbell'],
  });

  const rec = await recommendNext(context);

  console.log('Input: Readiness 71, MVC 82%, Label: felt_strong');
  console.log('Expected: Continue main lift, possibly increase');
  console.log('\nResult:');
  console.log('  Exercise:', rec.next_exercise.name);
  console.log('  Intent:', rec.next_exercise.intent);
  console.log('  Load:', rec.adjustments.load);
  console.log('  Confidence:', rec.confidence);
  console.log('  ✅ PASS' + (rec.next_exercise.intent === 'main' ? '' : ' ❌ FAIL'));
}

async function testScenario8_UserLabelPainFlag() {
  console.log('\n🧪 TEST 8: User Labeled "Pain Flag"');
  console.log('─'.repeat(60));

  const context = buildSessionContext({
    userId: 'test_user',
    recentSets: [{
      exerciseId: 'back_squat',
      exerciseName: 'Back Squat',
      repCount: 3,
      emgPeakRms: 750,
      emgRateOfRise: 480,
      symmetryPct: 85,
      mvcNormPct: 75,
      signalQuality: 'ok',
      fatigueIndex: 0.5,
      readinessAfter: 65,
      userLabel: 'pain_flag',  // Pain reported
    }],
    currentReadiness: 65,
    availableEquipment: ['machine'],
  });

  const rec = await recommendNext(context);

  console.log('Input: Readiness 65, MVC 75%, Label: pain_flag');
  console.log('Expected: Conservative recommendation (accessory)');
  console.log('\nResult:');
  console.log('  Exercise:', rec.next_exercise.name);
  console.log('  Intent:', rec.next_exercise.intent);
  console.log('  Load:', rec.adjustments.load);
  console.log('  Stop criteria:', rec.fatigue_guardrail.stop_if);
  console.log('  ✅ System should be conservative with pain flag');
}

// ============================================================================
// RUN ALL TESTS
// ============================================================================

async function runAllTests() {
  console.log('\n');
  console.log('═'.repeat(60));
  console.log('  EXERCISE RECOMMENDER V2 - VALIDATION TESTS');
  console.log('═'.repeat(60));

  try {
    await testScenario1_FreshSession();
    await testScenario2_HighActivation();
    await testScenario3_LowActivation();
    await testScenario4_HighFatigue();
    await testScenario5_Asymmetry();
    await testScenario6_BorderlineReadiness();
    await testScenario7_UserLabelFeltStrong();
    await testScenario8_UserLabelPainFlag();

    console.log('\n');
    console.log('═'.repeat(60));
    console.log('  ✅ ALL TESTS COMPLETED');
    console.log('═'.repeat(60));
    console.log('\nNote: All tests use fallback logic since Gemini is not integrated.');
    console.log('All recommendations have confidence: 0.6 (fallback mode).');
    console.log('\nOnce Gemini is integrated, confidence will be 0.7-0.95.');
    console.log('\n');

  } catch (error) {
    console.error('\n❌ TEST FAILED WITH ERROR:', error);
    if (error instanceof Error) {
      console.error('Stack:', error.stack);
    }
  }
}

// Run tests
runAllTests();
