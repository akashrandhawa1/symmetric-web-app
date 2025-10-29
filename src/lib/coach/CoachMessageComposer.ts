import type { CoachInsight } from './LlmOrchestrator';

export type CoachMessageTier = 'in_set' | 'post_set';
export type CoachAsk = 'rest_60_90s' | 'load_minus_5' | 'form_focus' | 'none';

export interface CoachFinalMessage {
  id: string;
  tier: CoachMessageTier;
  headline: string;
  subline?: string;
  tip?: string;
  actions: Array<'continue_anyway' | 'end_set'>;
  ask: CoachAsk;
  isFinal: true;
}

export interface CoachMessageEnvelope {
  message: CoachFinalMessage;
  meta: {
    source: CoachInsight['source'];
    state: CoachInsight['state'];
    type: CoachInsight['type'];
    confidence: number;
  };
}

const CHARACTER_LIMIT: Record<CoachMessageTier, number> = {
  in_set: 140,
  post_set: 160,
};

const BANNED_PATTERNS = [/next optimal session/gi];

function normaliseWhitespace(input: string): string {
  return input.replace(/\s+/g, ' ').trim();
}

function stripBannedPhrases(input: string | undefined): string | undefined {
  if (!input) return undefined;
  let output = input;
  for (const pattern of BANNED_PATTERNS) {
    output = output.replace(pattern, '').trim();
  }
  return normaliseWhitespace(output);
}

function trimToLimit(line: string, limit: number): string {
  if (line.length <= limit) return line;
  if (limit <= 1) return line.slice(0, Math.max(0, limit));
  const slice = line.slice(0, limit - 1);
  const lastSpace = slice.lastIndexOf(' ');
  if (lastSpace > 24) {
    return `${slice.slice(0, lastSpace)}…`;
  }
  return `${slice}…`;
}

function applyCombinedLimit(headline: string, subline: string | undefined, tier: CoachMessageTier): string | undefined {
  if (!subline) return undefined;
  const limit = CHARACTER_LIMIT[tier];
  const allowance = limit - headline.length - 1; // include minimal spacing
  if (allowance <= 0) {
    return undefined;
  }
  if (subline.length <= allowance) {
    return subline;
  }
  if (allowance < 12) {
    return trimToLimit(subline, allowance);
  }
  return trimToLimit(subline, allowance);
}

function filterActions(insight: CoachInsight): Array<'continue_anyway' | 'end_set'> {
  if (insight.state !== 'fall') {
    return [];
  }
  const allowed: Array<'continue_anyway' | 'end_set'> = [];
  for (const action of insight.actions) {
    if (action === 'continue_anyway' || action === 'end_set') {
      if (!allowed.includes(action)) {
        allowed.push(action);
      }
    }
  }
  return allowed;
}

function determineAsk(insight: CoachInsight, actions: Array<'continue_anyway' | 'end_set'>): CoachAsk {
  if (insight.state === 'fall') {
    return actions.includes('end_set') ? 'rest_60_90s' : 'form_focus';
  }
  if (insight.state === 'rise') {
    return 'form_focus';
  }
  if (insight.state === 'plateau' && insight.type === 'suggestion') {
    return 'form_focus';
  }
  if (insight.type === 'suggestion' && insight.metric_cited?.name === 'RMS') {
    return 'load_minus_5';
  }
  return 'none';
}

export interface ComposeCoachMessageArgs {
  insight: CoachInsight;
  tier: CoachMessageTier;
  id: string;
}

export function composeCoachMessage({ insight, tier, id }: ComposeCoachMessageArgs): CoachMessageEnvelope {
  const rawHeadline = stripBannedPhrases(insight.headline) ?? '';
  const rawSubline = stripBannedPhrases(insight.subline);
  const rawTip = stripBannedPhrases(insight.tip);

  const headline = rawHeadline;
  const subline = applyCombinedLimit(headline, rawSubline, tier);
  const tip = rawTip;
  const actions = filterActions(insight);
  const ask = determineAsk(insight, actions);

  const message: CoachFinalMessage = {
    id,
    tier,
    headline,
    subline: subline && subline.length > 0 ? subline : undefined,
    tip: tip && tip.length > 0 ? tip : undefined,
    actions,
    ask,
    isFinal: true,
  };

  return {
    message,
    meta: {
      source: insight.source,
      state: insight.state,
      type: insight.type,
      confidence: insight.confidence,
    },
  };
}
