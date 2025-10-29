import { describe, it, expect, vi } from 'vitest';
import { ensureVariety } from '../gemini';
import { pushHistory, resetHistory } from '../style/antiRepeat';
import type { CoachJSON } from '../types';

describe('style integration', () => {
  it('triggers rewrite when text is too similar', async () => {
    resetHistory();
    pushHistory({ message: 'Keep the drive crisp today.', cta: 'Start lift', secondary: null, science: null });

    const original: CoachJSON = {
      type: 'suggestion',
      mode: 'TRAIN',
      message: 'Keep the drive crisp today.',
      cta: 'Start lift',
    };

    const rewriteFn = vi.fn(async () => ({
      type: 'suggestion',
      mode: 'TRAIN',
      message: 'Groove clean triples and breathe between sets.',
      cta: 'Open strength block',
    }));

    const result = await ensureVariety(original, rewriteFn);
    expect(rewriteFn).toHaveBeenCalledTimes(1);
    expect(result.type).toBe('suggestion');
    if (result.type === 'suggestion') {
      const sentenceCount = result.message.split(/\./).filter(Boolean).length;
      expect(sentenceCount).toBeLessThanOrEqual(2);
    }
  });

  it('keeps output when copy is already distinct', async () => {
    resetHistory();
    const original: CoachJSON = {
      type: 'suggestion',
      mode: 'ACTIVE_RECOVERY',
      message: 'Float through zone-two so tissue stays supple.',
      cta: 'Start recovery flow',
      secondary: 'Light walk keeps legs ready for tomorrow.',
    };
    const rewriteFn = vi.fn(async () => original);
    const result = await ensureVariety(original, rewriteFn);
    expect(rewriteFn).not.toHaveBeenCalled();
    expect(result).toBe(original);
  });
});
