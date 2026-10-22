/**
 * Banned phrases per PRD §10.1:
 * Enforces strictly objective, service-and-waiting-focused explanations.
 * Prohibits crime predictions, neighborhood stigmatization, and victim-blaming.
 */
export const BANNED_PHRASES: readonly string[] = [
  "crime rate",
  "dangerous area",
  "criminal",
  "unsafe neighbourhood",
  "unsafe neighborhood",
  "she should have",
  "avoid wearing",
  "bad area",
  "high crime",
  "slum",
  "ghetto",
  "shady people",
  "sketchy area",
  "dangerous people",
  "victim",
] as const;

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
