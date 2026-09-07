type Ranked<T> = { item: T; score: number };

/**
 * Lightweight browser-safe retrieval helper.
 *
 * IMPORTANT: This file intentionally does NOT download a transformer model.
 * The previous browser-side embedding model could make the page unresponsive
 * on low-memory devices. Retrieval now uses token overlap + phrase matching.
 * This keeps IslamicAI instant and deterministic while preserving the same API.
 */

const normalize = (text: string) =>
  text
    .normalize("NFKC")
    .toLowerCase()
    .replace(/[^\p{L}\p{N}\s]/gu, " ")
    .replace(/\s+/g, " ")
    .trim();

const STOP_WORDS = new Set([
  "the","a","an","is","are","was","were","why","what","how","when","where","who","which",
  "to","of","and","or","in","on","for","from","with","about","does","do","did","can","could",
  "hai","hain","ho","ka","ke","ki","ko","kya","kyu","kyun","me","mein","mujhe","mujh","aur","se","par","ye","yah","woh","wo"
]);

const tokens = (text: string) =>
  normalize(text)
    .split(" ")
    .filter((x) => x.length > 1 && !STOP_WORDS.has(x));

const scoreText = (query: string, text: string) => {
  const q = tokens(query);
  const t = tokens(text);
  if (!q.length || !t.length) return 0;

  const set = new Set(t);
  let score = 0;
  for (const word of q) {
    if (set.has(word)) score += 1;
    else if (word.length >= 4 && t.some((candidate) => candidate.includes(word) || word.includes(candidate))) score += 0.35;
  }

  const phrase = normalize(query);
  const haystack = normalize(text);
  if (phrase.length >= 8 && haystack.includes(phrase)) score += 3;

  return score / Math.sqrt(q.length);
};

/** Drop-in replacement for the old embedding-based semanticRank API. */
export async function semanticRank<T>(
  query: string,
  items: T[],
  textOf: (item: T) => string,
  topK: number
): Promise<T[]> {
  if (!items.length) return [];
  const scored: Ranked<T>[] = items.map((item) => ({ item, score: scoreText(query, textOf(item)) }));
  return scored
    .sort((a, b) => b.score - a.score)
    .slice(0, topK)
    .map((x) => x.item);
}

/**
 * Keep this API for IslamicAI's Hinglish rendering path without loading a
 * 60MB+ translation model in the browser. The source Hadith remains unchanged
 * and is returned as the safe fallback when no local rendering is available.
 */
export async function englishToHinglish(text: string): Promise<string> {
  return text?.trim() || "";
}

/** Kept for compatibility with any future callers. */
export async function embedText(_text: string): Promise<number[]> {
  return [];
}
