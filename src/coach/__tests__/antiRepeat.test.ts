import { describe, it, expect, beforeEach } from 'vitest';
import { pushHistory, resetHistory, tooSimilarToRecent } from '../style/antiRepeat';

describe('antiRepeat', () => {
  beforeEach(() => {
    resetHistory();
  });

  it('flags near-identical phrasing', () => {
    pushHistory({ message: 'Keep the drive crisp today.', cta: 'Start strength block', secondary: null, science: null });
    const verdict = tooSimilarToRecent('Keep the drive crisp today. | Start strength block | |');
    expect(verdict).toBe(true);
  });

  it('allows distinct copy', () => {
    pushHistory({ message: 'Settle into clean reps and breathe between efforts.', cta: 'Open recovery flow', secondary: null, science: null });
    const verdict = tooSimilarToRecent('Float through light cardio so tomorrow loads better. | Begin recovery session | |');
    expect(verdict).toBe(false);
  });

  it('flags overlapping bigrams when repetition is high', () => {
    pushHistory({ message: 'Lock in crisp triples and keep tempo tight.', cta: 'Start lift', secondary: null, science: null });
    const verdict = tooSimilarToRecent('Lock in crisp triples for tempo control. | Get lifting | |');
    expect(verdict).toBe(true);
  });
});
