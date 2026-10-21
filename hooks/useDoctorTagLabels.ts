import { useEffect, useMemo, useState } from "react";
import { resolveDoctorTagLabels } from "@/domains/doctor/tags-api";
import type { Locale } from "@/domains/i18n/store";

export function useDoctorTagLabels(tags: string[], locale: Locale) {
  const [displayByCanonical, setDisplayByCanonical] = useState<Record<string, string>>({});

  const canonicalTags = useMemo(
    () => tags.map((tag) => tag.trim()).filter(Boolean),
    [tags],
  );
  const signature = canonicalTags.join("\u0001");

  useEffect(() => {
    if (!canonicalTags.length) {
      setDisplayByCanonical({});
      return;
    }

    let cancelled = false;
    void resolveDoctorTagLabels(canonicalTags, locale)
      .then((rows) => {
        if (cancelled) return;
        const next: Record<string, string> = {};
        for (const row of rows) {
          next[row.canonical] = row.display;
        }
        setDisplayByCanonical(next);
      })
      .catch(() => {
        if (cancelled) return;
        const fallback: Record<string, string> = {};
        for (const tag of canonicalTags) fallback[tag] = tag;
        setDisplayByCanonical(fallback);
      });

    return () => {
      cancelled = true;
    };
  }, [signature, locale, canonicalTags]);

  const items = useMemo(
    () =>
      canonicalTags.map((canonical) => ({
        canonical,
        display: displayByCanonical[canonical] ?? canonical,
      })),
    [canonicalTags, displayByCanonical],
  );

  return items;
}
