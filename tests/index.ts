import { runTests as runFatigueDetectorTests } from './fatigueDetector.test';
import { runTests as runCoachOrchestratorTests } from './coachOrchestrator.test';
import { runTests as runVoiceOffersTests } from './voice.offers.test';
import { runTests as runVoiceCoreTests } from './voice.core.test';

export async function runTests() {
  await runFatigueDetectorTests();
  await runCoachOrchestratorTests();
  await runVoiceOffersTests();
  await runVoiceCoreTests();
}
