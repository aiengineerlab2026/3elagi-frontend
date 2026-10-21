const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

/** Split comma / semicolon / newline separated values. */
export function parseCommaList(raw: string): string[] {
  return raw
    .split(/[,;\n]+/)
    .map((part) => part.trim())
    .filter(Boolean);
}

export function parseCommaEmails(raw: string): string[] {
  const seen = new Set<string>();
  const results: string[] = [];
  for (const part of parseCommaList(raw)) {
    const email = part.toLowerCase();
    if (!EMAIL_RE.test(email) || seen.has(email)) continue;
    seen.add(email);
    results.push(email);
  }
  return results;
}
