import { describe, it, expect } from 'vitest'
import { parseIntervalToHours } from './intervalParser'

describe('parseIntervalToHours', () => {
  // ── Smoke / default ──────────────────────────────────────────────────────

  it('returns 8h fallback for undefined input', () => {
    const result = parseIntervalToHours(undefined)
    expect(result.hours).toBe(8)
  })

  it('returns 8h fallback for empty string', () => {
    const result = parseIntervalToHours('')
    expect(result.hours).toBe(8)
  })

  it('returns 8h fallback for whitespace-only string', () => {
    const result = parseIntervalToHours('   ')
    expect(result.hours).toBe(8)
  })

  it('returns 8h fallback for unrecognised text', () => {
    const result = parseIntervalToHours('as needed')
    expect(result.hours).toBe(8)
  })

  // ── English patterns ─────────────────────────────────────────────────────

  it('parses "once daily" as 24 hours', () => {
    expect(parseIntervalToHours('once daily').hours).toBe(24)
  })

  it('parses "once a day" as 24 hours', () => {
    expect(parseIntervalToHours('once a day').hours).toBe(24)
  })

  it('parses "twice daily" as 12 hours', () => {
    expect(parseIntervalToHours('twice daily').hours).toBe(12)
  })

  it('parses "twice a day" as 12 hours', () => {
    expect(parseIntervalToHours('twice a day').hours).toBe(12)
  })

  it('parses "3 times daily" as 8 hours', () => {
    expect(parseIntervalToHours('3 times daily').hours).toBe(8)
  })

  it('parses "3 times a day" as 8 hours', () => {
    expect(parseIntervalToHours('3 times a day').hours).toBe(8)
  })

  it('parses "4 times a day" as 6 hours', () => {
    expect(parseIntervalToHours('4 times a day').hours).toBe(6)
  })

  it('parses "every 8 hours" as 8 hours', () => {
    expect(parseIntervalToHours('every 8 hours').hours).toBe(8)
  })

  it('parses "every 12 hours" as 12 hours', () => {
    expect(parseIntervalToHours('every 12 hours').hours).toBe(12)
  })

  it('parses "every 6 hours" as 6 hours', () => {
    expect(parseIntervalToHours('every 6 hours').hours).toBe(6)
  })

  it('parses "three times daily" as 8 hours', () => {
    expect(parseIntervalToHours('three times daily').hours).toBe(8)
  })

  it('parses "four times daily" as 6 hours', () => {
    expect(parseIntervalToHours('four times daily').hours).toBe(6)
  })

  // ── Case insensitivity ────────────────────────────────────────────────────

  it('is case-insensitive for "TWICE DAILY"', () => {
    expect(parseIntervalToHours('TWICE DAILY').hours).toBe(12)
  })

  it('is case-insensitive for "Every 8 Hours"', () => {
    expect(parseIntervalToHours('Every 8 Hours').hours).toBe(8)
  })

  // ── Arabic patterns ───────────────────────────────────────────────────────

  it('parses Arabic "مرتين يوميًا" as 12 hours', () => {
    expect(parseIntervalToHours('مرتين يوميًا').hours).toBe(12)
  })

  it('parses Arabic "3 مرات يوميًا" as 8 hours', () => {
    expect(parseIntervalToHours('3 مرات يوميًا').hours).toBe(8)
  })

  it('parses Arabic "كل 8 ساعات" as 8 hours', () => {
    expect(parseIntervalToHours('كل 8 ساعات').hours).toBe(8)
  })

  it('parses Arabic "مرة واحدة يوميًا" as 24 hours', () => {
    expect(parseIntervalToHours('مرة واحدة يوميًا').hours).toBe(24)
  })

  // ── Label output ──────────────────────────────────────────────────────────

  it('returns a non-empty label string', () => {
    const result = parseIntervalToHours('twice daily')
    expect(typeof result.label).toBe('string')
    expect(result.label.length).toBeGreaterThan(0)
  })

  it('returns ParsedInterval shape { hours, label }', () => {
    const result = parseIntervalToHours('every 6 hours')
    expect(result).toHaveProperty('hours')
    expect(result).toHaveProperty('label')
  })
})
