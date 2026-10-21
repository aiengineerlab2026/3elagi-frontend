/** Split plain speech text into highlightable words. */
export function splitSpokenWords(text: string): string[] {
  return text.trim().split(/\s+/).filter(Boolean);
}
