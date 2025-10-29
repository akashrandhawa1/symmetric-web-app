export type CoachCopy = {
  message: string;
  cta: string;
  secondary?: string | null;
  science?: string | null;
};

const MAX_HISTORY = 30;
const SIM_THRESHOLD = 0.32;
const BIGRAM_BAN_OVERLAP = 3;

let history: CoachCopy[] = [];

export function resetHistory() {
  history = [];
}

export function pushHistory(copy: CoachCopy) {
  history.unshift(copy);
  if (history.length > MAX_HISTORY) history.pop();
}

function tokenizeBigrams(input: string): Set<string> {
  const tokens = input
    .toLowerCase()
    .replace(/[^a-z0-9\s]/g, ' ')
    .split(/\s+/)
    .filter(Boolean);
  const pairs: string[] = [];
  for (let i = 0; i < tokens.length - 1; i += 1) {
    pairs.push(`${tokens[i]} ${tokens[i + 1]}`);
  }
  return new Set(pairs);
}

function trigrams(input: string): Set<string> {
  const tokens = input
    .toLowerCase()
    .replace(/[^a-z0-9\s]/g, ' ')
    .split(/\s+/)
    .filter(Boolean);
  const tri: string[] = [];
  for (let i = 0; i < tokens.length - 2; i += 1) {
    tri.push(`${tokens[i]} ${tokens[i + 1]} ${tokens[i + 2]}`);
  }
  return new Set(tri);
}

function jaccard<T>(a: Set<T>, b: Set<T>): number {
  const intersection = [...a].filter((item) => b.has(item)).length;
  const union = new Set([...a, ...b]).size;
  return union === 0 ? 0 : intersection / union;
}

export function tooSimilarToRecent(text: string): boolean {
  const currentTri = trigrams(text);
  const currentBi = tokenizeBigrams(text);
  for (const past of history.slice(0, 10)) {
    const tri = trigrams(past.message);
    const bi = tokenizeBigrams(past.message);
    const triSim = jaccard(currentTri, tri);
    const biOverlap = [...currentBi].filter((item) => bi.has(item)).length;
    if (triSim >= SIM_THRESHOLD || biOverlap >= BIGRAM_BAN_OVERLAP) {
      return true;
    }
  }
  return false;
}
