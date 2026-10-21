const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export interface MarketingRecipient {
  name: string;
  email: string;
}

/** Parse one recipient per line: "Name, email", "Name <email>", or email only. */
export function parseMarketingRecipients(raw: string): MarketingRecipient[] {
  const lines = raw
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter(Boolean);

  const results: MarketingRecipient[] = [];
  const seen = new Set<string>();

  for (const line of lines) {
    let name = "";
    let email = "";

    const angle = line.match(/^(.+?)\s*<([^>]+)>$/);
    if (angle) {
      name = angle[1].trim();
      email = angle[2].trim();
    } else if (line.includes(",")) {
      const parts = line.split(",").map((part) => part.trim());
      name = parts[0] ?? "";
      email = parts.slice(1).join(",").trim();
    } else if (line.includes(";")) {
      const parts = line.split(";").map((part) => part.trim());
      name = parts[0] ?? "";
      email = parts[1] ?? "";
    } else if (line.includes("\t")) {
      const parts = line.split("\t").map((part) => part.trim());
      name = parts[0] ?? "";
      email = parts[1] ?? "";
    } else if (EMAIL_RE.test(line)) {
      email = line;
      name = line.split("@")[0]?.replace(/[._-]+/g, " ") ?? "Doctor";
    } else {
      continue;
    }

    email = email.trim().toLowerCase();
    if (!email || !EMAIL_RE.test(email)) continue;

    if (seen.has(email)) continue;
    seen.add(email);

    results.push({
      name: name.trim() || "Doctor",
      email,
    });
  }

  return results;
}
