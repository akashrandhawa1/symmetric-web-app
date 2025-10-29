import type { Zone } from '../fatigue/types';

export function primaryLine(zone: Zone): string {
  switch (zone) {
    case 'in_zone':
      return 'Money set. You hit the strength zone right on cue.';
    case 'too_heavy_early':
      return 'Came in hot. You hit fatigue too early this set.';
    case 'too_light':
      return 'Cruisy. You stayed fresh past the target window.';
    case 'low_signal':
      return 'Signal was flaky—reading might be off.';
    default:
      return 'Set saved.';
  }
}

export function secondaryLine(zone: Zone): string {
  switch (zone) {
    case 'in_zone':
      return 'Rest 90s, same effort next set. If it felt snappy, add +1 rep.';
    case 'too_heavy_early':
      return 'Back off one effort notch; rest 90–120s. Aim to land fatigue at reps 7–10.';
    case 'too_light':
      return 'Add +2 reps or nudge effort +1. Shorter rest (~60s) keeps recruitment high.';
    case 'low_signal':
      return 'Re-seat electrode, dry sweat, then repeat at the same effort.';
    default:
      return 'Shake it out and get ready.';
  }
}

export function whyLine(zone: Zone, ctx: { totalRisePct: number; slopePctPerRep: number }): string {
  const rise = Math.round(ctx.totalRisePct * 100) / 100;
  const slope = Math.round(ctx.slopePctPerRep * 100) / 100;
  switch (zone) {
    case 'in_zone':
      return `RMS up ~${rise}% with steady rise (~${slope}%/rep).`;
    case 'too_heavy_early':
      return `Big RMS surge early (~${rise}%) → unsustainable this set.`;
    case 'too_light':
      return `RMS rise below target (~${rise}%).`;
    default:
      return '';
  }
}

