// Guardrails for Gemini coach feedback
export function ensurePayoffIfGeneric(why: string, payoff?: {magnitudePct:number, hours:number}): string {
  const GENERIC_PATTERNS = [
    /drink water/i,
    /sleep/i,
    /stretch/i,
    /breathe/i,
    /recover/i,
    /rest/i,
    /hydrate/i,
  ];
  let isGeneric = GENERIC_PATTERNS.some((pat) => pat.test(why));
  let suffix = '';
  if (isGeneric && payoff && payoff.magnitudePct && payoff.hours) {
    suffix = ` (+${Math.round(payoff.magnitudePct)}% in ~${Math.round(payoff.hours)}h)`;
  }
  let trimmed = why;
  if (suffix && (why.length + suffix.length) <= 90) {
    trimmed = why + suffix;
  } else if (why.length > 90) {
    trimmed = why.slice(0, 90);
  }
  return trimmed;
}
