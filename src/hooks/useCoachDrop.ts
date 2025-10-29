import { useCallback, useRef, useState } from 'react';
import type { DropNote } from '@/components/notify/DropStack';

type NoteTone = NonNullable<DropNote['tone']>;

type RepBand = 'warmup' | 'strength_zone' | 'beyond';

const createId = (): string =>
  typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function'
    ? crypto.randomUUID()
    : `note-${Math.random().toString(36).slice(2, 9)}`;

const bandTone: Record<RepBand, NoteTone> = {
  warmup: 'info',
  strength_zone: 'success',
  beyond: 'warn',
};

const warmupVariants = [
  "You're building into the set—keep the tempo clean.",
  "Nice opener. Stay controlled as you ramp toward strength reps.",
  "Great start. Groove the pattern before the heavy work."
];

const strengthVariants = [
  "Money reps—you're squarely in the 3–6 strength zone.",
  "Perfect pace. This is the Goldilocks range for strength.",
  "Locked in! These reps drive the high-threshold fibers."
];

const beyondVariants = [
  "Heads up—past 8 reps drifts into unproductive fatigue.",
  "Ease it down; beyond 8 reps saps strength without upside.",
  "You've crossed rep 8. Rack it to protect power output."
];

const pick = (arr: string[]): string => arr[Math.floor(Math.random() * arr.length)];

const repToBand = (repIdx: number): RepBand | null => {
  if (repIdx <= 2) return 'warmup';
  if (repIdx >= 3 && repIdx <= 6) return 'strength_zone';
  if (repIdx > 8) return 'beyond';
  return null;
};

export function useCoachDrop() {
  const [notes, setNotes] = useState<DropNote[]>([]);
  const lastBandRef = useRef<RepBand | ''>('');

  const pushRepCue = useCallback((repIdx: number) => {
    const band = repToBand(repIdx);
    if (!band || band === lastBandRef.current) return;
    lastBandRef.current = band;

    const id = createId();
    const note: DropNote = {
      id,
      tone: bandTone[band],
      ttlMs: 1500,
      title:
        band === 'warmup'
          ? 'Warming up'
          : band === 'strength_zone'
          ? 'Strength zone'
          : 'Ease up',
      body:
        band === 'warmup'
          ? pick(warmupVariants)
          : band === 'strength_zone'
          ? pick(strengthVariants)
          : pick(beyondVariants),
    };

    setNotes((prev) => [note, ...prev].slice(0, 3));
  }, []);

  const dismiss = useCallback((id: string) => {
    setNotes((prev) => prev.filter((n) => n.id !== id));
  }, []);

  const reset = useCallback(() => {
    lastBandRef.current = '';
    setNotes([]);
  }, []);

  return { notes, pushRepCue, dismiss, reset };
}
