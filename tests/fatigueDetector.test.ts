import assert from 'node:assert';
import { FatigueDetector } from '../lib/fatigue/FatigueDetector';

const BASELINE_NOW = 0;

function advance(detector: FatigueDetector, samples: Array<{ t: number; value: number }>) {
  samples.forEach(({ t, value }) => {
    detector.update({ nowSec: BASELINE_NOW + t, rmsNorm: value });
  });
}

async function testRiseTransition() {
  const detector = new FatigueDetector({
    ewmaAlpha: 1,
    slopeLookbackSec: 1,
    curvatureLookbackSec: 2,
    plateauCurvatureThreshold: 10,
    plateauSlopeThreshold: 1,
    riseMinDurationSec: 1,
    plateauMinDurationSec: 0.1,
    fallMinDurationSec: 1,
    requireMdfConfirmation: false,
  });
  let riseDetected = false;
  detector.onState((event) => {
    if (event.state === 'rise') {
      riseDetected = true;
    }
  });

  advance(detector, [
    { t: 0, value: 0 },
    { t: 1, value: 0.2 },
    { t: 2, value: 0.4 },
    { t: 3, value: 0.6 },
    { t: 4, value: 0.8 },
    { t: 5, value: 1.0 },
  ]);

  assert.ok(riseDetected || detector.getState() === 'rise', 'Expected state to transition to rise');
}

async function testPlateauTransition() {
  const detector = new FatigueDetector({
    ewmaAlpha: 1,
    slopeLookbackSec: 1,
    curvatureLookbackSec: 2,
    plateauCurvatureThreshold: 1,
    plateauSlopeThreshold: 0.5,
    riseMinDurationSec: 1,
    plateauMinDurationSec: 1,
    fallMinDurationSec: 1,
    requireMdfConfirmation: false,
    noiseThreshold: 0.01,
  });
  let plateauDetected = false;
  detector.onState((event) => {
    if (event.state === 'plateau') {
      plateauDetected = true;
    }
  });

  for (let i = 0; i < 6; i += 1) {
    detector.update({ nowSec: i, rmsNorm: i * 0.08 });
  }
  for (let i = 6; i < 30; i += 1) {
    detector.update({ nowSec: i, rmsNorm: 0.48 + Math.sin(i) * 0.003 });
  }

  assert.ok(plateauDetected || detector.getState() === 'plateau', 'Expected plateau to be detected');
}

async function testFallTransition() {
  const detector = new FatigueDetector({
    ewmaAlpha: 1,
    slopeLookbackSec: 1,
    curvatureLookbackSec: 2,
    plateauCurvatureThreshold: 1,
    plateauSlopeThreshold: 0.5,
    riseMinDurationSec: 1,
    plateauMinDurationSec: 1,
    fallMinDurationSec: 1,
    requireMdfConfirmation: false,
    noiseThreshold: 0.01,
  });
  let fallDetected = false;
  detector.onState((event) => {
    if (event.state === 'fall') {
      fallDetected = true;
    }
  });

  // Rise
  for (let i = 0; i < 6; i += 1) {
    detector.update({ nowSec: i, rmsNorm: i * 0.05 });
  }
  // Plateau
  for (let i = 6; i < 14; i += 1) {
    detector.update({ nowSec: i, rmsNorm: 0.35 });
  }
  // Fall
  for (let i = 14; i < 18; i += 1) {
    detector.update({ nowSec: i, rmsNorm: 0.35 - (i - 13) * 0.06 });
  }

  assert.ok(fallDetected, 'Expected fall to be detected');
}

async function testNoiseGuard() {
  const detector = new FatigueDetector({
    ewmaAlpha: 1,
    slopeLookbackSec: 1,
    curvatureLookbackSec: 2,
    riseMinDurationSec: 1,
    plateauMinDurationSec: 1,
    fallMinDurationSec: 1,
    requireMdfConfirmation: false,
    noiseThreshold: 0.01,
  });
  let stateChanges = 0;
  detector.onState(() => {
    stateChanges += 1;
  });

  for (let i = 0; i < 20; i += 1) {
    detector.update({ nowSec: i * 0.5, rmsNorm: 0.002 * Math.sin(i) });
  }

  assert.strictEqual(stateChanges, 0, 'Noise should not trigger state changes');
}

export async function runTests() {
  await testRiseTransition();
  await testPlateauTransition();
  await testFallTransition();
  await testNoiseGuard();
}
