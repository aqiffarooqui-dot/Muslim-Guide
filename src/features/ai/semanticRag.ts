type Ranked<T> = { item: T; score: number };

/**
 * Lightweight, browser-safe Islamic evidence retrieval.
 * No model download: uses normalized tokens, intent expansion, phrase matching,
 * and source-aware scoring so Hinglish questions can find English Qur'an/Hadith.
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
  "hai","hain","ho","ka","ke","ki","ko","kya","kyu","kyun","kyon","me","mein","mujhe","mujh",
  "aur","se","par","ye","yah","woh","wo","hum","ham","hume","hame","kar","karo","kr","karta",
  "karte","karna","kyunki","liye","liye","baare","bare","batao","bataye","bataiye"
]);

const INTENT_MAP: Record<string, string[]> = {
  namaz: ["prayer", "salah", "salat", "five daily prayers", "worship", "remember Allah", "remembrance", "fahsha", "wrongdoing"],
  namazkyu: ["prayer", "salah", "worship", "remember Allah", "remembrance", "establish prayer", "fahsha", "wrongdoing"],
  roza: ["fasting", "fast", "ramadan", "taqwa", "self restraint", "self control"],
  sabr: ["patience", "patient", "perseverance", "steadfast", "hardship", "trial"],
  dua: ["supplication", "call upon Allah", "invoke", "prayer", "dua"],
  zakat: ["zakah", "zakat", "charity", "purify", "wealth", "spend"],
  sadqa: ["charity", "sadaqah", "spend", "poor", "needy"],
  maafi: ["forgive", "forgiveness", "mercy", "repentance", "repent", "sins"],
  gunah: ["sin", "sins", "forgive", "repentance", "evil deeds"],
  walidain: ["parents", "mother", "father", "kindness", "parents rights"],
  jannat: ["paradise", "garden", "believers", "righteous"],
  jahannam: ["hell", "fire", "punishment", "disbelievers"],
  maut: ["death", "die", "deceased", "hereafter", "resurrection"],
  tawakkul: ["trust Allah", "rely on Allah", "Allah sufficient", "patience"],
  allah: ["Allah", "Lord", "God", "worship", "remembrance"]
};

const aliases: Record<string, string[]> = {
  namaz: ["prayer", "salah", "salat"], salah: ["prayer", "namaz"], salat: ["prayer", "namaz"],
  padhna: ["pray", "prayer", "recite"], padhte: ["pray", "prayer"], ibadat: ["worship", "prayer"],
  allah: ["Allah", "Lord"], rab: ["Lord", "Allah"], khuda: ["Allah", "God"],
  kyu: ["why", "purpose", "reason"], kyun: ["why", "purpose", "reason"], zaroori: ["important", "command", "obligation"],
  roza: ["fasting", "fast"], ramzan: ["ramadan", "fasting"], ramadan: ["fasting", "taqwa"],
  sabr: ["patience", "perseverance"], mushkil: ["hardship", "difficulty", "trial"],
  maafi: ["forgiveness", "mercy"], tauba: ["repentance", "repent"], gunah: ["sin", "sins"],
  walidain: ["parents"], maa: ["mother", "parents"], baap: ["father", "parents"],
  dua: ["supplication", "invoke"], zakat: ["zakah", "charity"], sadqa: ["charity", "sadaqah"],
  jannat: ["paradise"], jahannam: ["hell", "fire"], maut: ["death", "hereafter"]
};

const tokens = (text: string) =>
  normalize(text)
    .split(" ")
    .filter((x) => x.length > 1 && !STOP_WORDS.has(x));

const expandedTokens = (query: string) => {
  const base = tokens(query);
  const out = new Set(base);
  for (const word of base) {
    for (const value of aliases[word] || []) out.add(normalize(value));
  }
  const compact = normalize(query).replace(/\s+/g, "");
  for (const [key, values] of Object.entries(INTENT_MAP)) {
    if (compact.includes(key) || base.includes(key)) values.forEach((v) => out.add(normalize(v)));
  }
  return [...out].filter(Boolean);
};

const scoreText = (query: string, text: string) => {
  const q = expandedTokens(query);
  const t = tokens(text);
  if (!q.length || !t.length) return 0;
  const set = new Set(t);
  let score = 0;
  for (const word of q) {
    if (set.has(word)) score += 1;
    else if (word.length >= 4 && t.some((candidate) => candidate.includes(word) || word.includes(candidate))) score += 0.3;
  }
  const phrase = normalize(query);
  const haystack = normalize(text);
  if (phrase.length >= 8 && haystack.includes(phrase)) score += 3;
  if (/allah|lord/.test(haystack) && /allah|ibadat|worship|namaz|prayer|salah/.test(normalize(query))) score += 0.8;
  return score / Math.sqrt(Math.max(q.length, 1));
};

export async function semanticRank<T>(query: string, items: T[], textOf: (item: T) => string, topK: number): Promise<T[]> {
  if (!items.length) return [];
  const scored: Ranked<T>[] = items.map((item) => ({ item, score: scoreText(query, textOf(item)) }));
  return scored.filter((x) => x.score > 0).sort((a, b) => b.score - a.score).slice(0, topK).map((x) => x.item);
}

/**
 * Deterministic English -> Hinglish rendering for common Islamic answer text.
 * It never alters the original source; it is only used for the displayed answer.
 */
const PHRASES: Array<[RegExp, string]> = [
  [/Allah is the One God/gi, "Allah hi Wahid Ma'bood hain"],
  [/remember Allah/gi, "Allah ko yaad karna"],
  [/remembrance of Allah/gi, "Allah ka zikr"],
  [/establish prayer/gi, "namaz qayam karna"],
  [/the prayer/gi, "namaz"],
  [/prayer/gi, "namaz"],
  [/worship/gi, "ibadat"],
  [/believers/gi, "imaan wale log"],
  [/forgiveness/gi, "maghfirat aur maafi"],
  [/mercy/gi, "rehmat"],
  [/patience/gi, "sabr"],
  [/hardship/gi, "mushkil waqt"],
  [/difficulty/gi, "mushkil"],
  [/fasting/gi, "roza rakhna"],
  [/charity/gi, "sadaqah/khairaat"],
  [/parents/gi, "walidain"],
  [/paradise/gi, "Jannat"],
  [/hell/gi, "Jahannam"],
  [/sin/gi, "gunah"],
  [/repentance/gi, "tauba"],
  [/guidance/gi, "hidayat"],
  [/righteousness/gi, "nek amal"],
  [/good deeds/gi, "nek aamaal"],
  [/evil deeds/gi, "bure aamaal"],
  [/command/gi, "hukm"],
  [/obligation/gi, "farz"],
  [/life/gi, "zindagi"],
  [/hereafter/gi, "aakhirat"]
];

export async function englishToHinglish(text: string): Promise<string> {
  let result = (text || "").trim();
  if (!result) return "";
  for (const [pattern, replacement] of PHRASES) result = result.replace(pattern, replacement);
  return result;
}

export async function embedText(_text: string): Promise<number[]> { return []; }
