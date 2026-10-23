/**
 * Banned phrases per PRD §10.1 and §10.3:
 * Enforces strictly objective, service-and-waiting-focused explanations.
 * Prohibits crime predictions, neighborhood stigmatization, and victim-blaming.
 */
export const BANNED_PHRASES: readonly string[] = [
  // Crime prediction & neighborhood stigmatization
  "crime rate",
  "dangerous area",
  "criminal zone",
  "criminal",
  "unsafe neighbourhood",
  "unsafe neighborhood",
  "high crime",
  "bad area",
  "slum",
  "ghetto",
  "shady people",
  "sketchy area",
  "dangerous people",
  "crime zone",
  "khatarnak ilaka",

  // Victim blaming
  "should not have",
  "she should have",
  "asking for it",
  "avoid wearing",
  "ladkiyon ko nahi aana chahiye",
  "auraton ko nahi aana chahiye",
  "victim",
] as const;

export interface BannedPhraseScanResult {
  hasBanned: boolean;
  hits: string[];
}

/**
 * Checks whether the given text contains any banned phrases (case-insensitive).
 */
export function containsBannedPhrase(text: string): boolean {
  if (!text) return false;
  const lower = text.toLowerCase();
  return BANNED_PHRASES.some((phrase) => lower.includes(phrase));
}

/**
 * Returns all banned phrases found in the given text.
 */
export function findBannedPhrases(text: string): string[] {
  if (!text) return [];
  const lower = text.toLowerCase();
  return BANNED_PHRASES.filter((phrase) => lower.includes(phrase));
}

/**
 * Scans text and returns structured result with boolean flag and hit list.
 */
export function scanBannedPhrases(text: string): BannedPhraseScanResult {
  const hits = findBannedPhrases(text);
  return {
    hasBanned: hits.length > 0,
    hits,
  };
}
