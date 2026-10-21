/**
 * reminders/intervalParser.ts
 *
 * Converts free-text prescription interval strings into numeric hours.
 *
 * Examples:
 *   "twice daily"      → 12h
 *   "3 times daily"    → 8h
 *   "every 8 hours"    → 8h
 *   "once a day"       → 24h
 *   "4 times a day"    → 6h
 *   "every 12 hours"   → 12h
 *   "مرتين يوميًا"     → 12h  (Arabic: twice daily)
 *   "3 مرات يوميًا"    → 8h   (Arabic: 3 times daily)
 */
import type { ParsedInterval } from './types'

const HOURS_PER_DAY = 24
const FALLBACK_HOURS = 8

/** Patterns listed from most-specific to least-specific. */
const PATTERNS: Array<{ regex: RegExp; resolve: (m: RegExpMatchArray) => number }> = [
  // "every N hours" / "كل N ساعات"
  {
    regex: /every\s+(\d+)\s+hours?/i,
    resolve: (m) => Number(m[1]),
  },
  {
    regex: /كل\s+(\d+)\s+ساعات?/,
    resolve: (m) => Number(m[1]),
  },
  // "N times daily/a day" / "N مرات يوميًا"
  {
    regex: /(\d+)\s+times?\s+(?:daily|a\s+day)/i,
    resolve: (m) => Math.round(HOURS_PER_DAY / Number(m[1])),
  },
  {
    regex: /(\d+)\s+مرات?\s+(?:يوميًا|في\s+اليوم)/,
    resolve: (m) => Math.round(HOURS_PER_DAY / Number(m[1])),
  },
  // "twice daily" / "مرتين يوميًا"
  {
    regex: /twice\s+(?:daily|a\s+day)/i,
    resolve: () => 12,
  },
  {
    regex: /مرتين\s+(?:يوميًا|في\s+اليوم)/,
    resolve: () => 12,
  },
  // "once daily/a day" / "مرة واحدة يوميًا"
  {
    regex: /once\s+(?:daily|a\s+day)/i,
    resolve: () => 24,
  },
  {
    regex: /مرة\s+(?:واحدة\s+)?(?:يوميًا|في\s+اليوم)/,
    resolve: () => 24,
  },
  // "three times" shorthand
  {
    regex: /three\s+times?\s+(?:daily|a\s+day)/i,
    resolve: () => 8,
  },
  // "four times" shorthand
  {
    regex: /four\s+times?\s+(?:daily|a\s+day)/i,
    resolve: () => 6,
  },
]

/**
 * Parse a free-text interval string and return the equivalent hours between doses.
 * Falls back to FALLBACK_HOURS (8h) when the text cannot be parsed.
 */
export function parseIntervalToHours(interval: string | undefined): ParsedInterval {
  if (!interval?.trim()) {
    return { hours: FALLBACK_HOURS, label: `Every ${FALLBACK_HOURS} hours (default)` }
  }

  const text = interval.trim()

  for (const { regex, resolve } of PATTERNS) {
    const match = text.match(regex)
    if (match) {
      const hours = resolve(match)
      if (hours > 0 && hours <= HOURS_PER_DAY) {
        return { hours, label: `Every ${hours} hour${hours !== 1 ? 's' : ''}` }
      }
    }
  }

  return { hours: FALLBACK_HOURS, label: `Every ${FALLBACK_HOURS} hours (default)` }
}
