const NOISE_ONLY =
  /^(uh+|um+|umm+|ah+|oh+|hm+|hmm+|mm+|mhm+|a+|e+|o+|la+|na+|ok|yeah|yes|no)$/i;

/** True when transcript looks like real speech, not filler/noise. */
export function isMeaningfulSpeech(text: string): boolean {
  const trimmed = text.trim();
  if (trimmed.length < 3) return false;
  if (!/[\p{L}\p{N}]/u.test(trimmed)) return false;

  const tokens = trimmed
    .split(/\s+/)
    .map((t) => t.replace(/^[^\p{L}\p{N}]+|[^\p{L}\p{N}]+$/gu, ""))
    .filter(Boolean);

  if (tokens.length === 0) return false;

  const meaningful = tokens.filter(
    (t) => t.length >= 2 && !NOISE_ONLY.test(t),
  );

  if (meaningful.length === 0) return false;

  const substantial = meaningful.some((t) => t.length >= 3);
  return substantial || meaningful.length >= 2;
}
