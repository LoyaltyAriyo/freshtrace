<<<<<<< Updated upstream
import { describe, expect, it } from "vitest"
import { parseTimeRange, resolveStartDate } from "./overview-metrics"

describe("parseTimeRange", () => {
  it('returns "today" for "today" input', () => {
    expect(parseTimeRange("today")).toBe("today")
  })

  it('returns "7d" for "7d" input', () => {
    expect(parseTimeRange("7d")).toBe("7d")
  })

  it('returns "30d" for "30d" input', () => {
    expect(parseTimeRange("30d")).toBe("30d")
  })

  it('defaults to "7d" for null', () => {
    expect(parseTimeRange(null)).toBe("7d")
  })

  it('defaults to "7d" for empty string', () => {
    expect(parseTimeRange("")).toBe("7d")
  })

  it('defaults to "7d" for invalid input', () => {
    expect(parseTimeRange("90d")).toBe("7d")
    expect(parseTimeRange("abc")).toBe("7d")
  })

  it("is case-insensitive", () => {
    expect(parseTimeRange("TODAY")).toBe("today")
    expect(parseTimeRange("7D")).toBe("7d")
    expect(parseTimeRange("30D")).toBe("30d")
  })
})

describe("resolveStartDate", () => {
  it('returns start of today for "today" range', () => {
    const result = resolveStartDate("today")
    const now = new Date()

    expect(result.getFullYear()).toBe(now.getFullYear())
    expect(result.getMonth()).toBe(now.getMonth())
    expect(result.getDate()).toBe(now.getDate())
    expect(result.getHours()).toBe(0)
    expect(result.getMinutes()).toBe(0)
    expect(result.getSeconds()).toBe(0)
  })

  it('returns a date ~7 days ago for "7d" range', () => {
    const result = resolveStartDate("7d")
    const now = new Date()
    const diffMs = now.getTime() - result.getTime()
    const diffDays = diffMs / (1000 * 60 * 60 * 24)

    expect(diffDays).toBeGreaterThanOrEqual(6.9)
    expect(diffDays).toBeLessThanOrEqual(7.1)
  })

  it('returns a date ~30 days ago for "30d" range', () => {
    const result = resolveStartDate("30d")
    const now = new Date()
    const diffMs = now.getTime() - result.getTime()
    const diffDays = diffMs / (1000 * 60 * 60 * 24)

    expect(diffDays).toBeGreaterThanOrEqual(29.9)
    expect(diffDays).toBeLessThanOrEqual(30.1)
=======
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest"

import { parseTimeRange, resolveStartDate } from "./overview-metrics"

const FIXED_NOW = new Date("2026-04-13T15:30:00.000Z")

describe("parseTimeRange", () => {
  it("accepts today, 7d, and 30d case-insensitively", () => {
    expect(parseTimeRange("today")).toBe("today")
    expect(parseTimeRange("TODAY")).toBe("today")
    expect(parseTimeRange("7d")).toBe("7d")
    expect(parseTimeRange("30D")).toBe("30d")
  })

  it("defaults invalid or empty values to 7d", () => {
    expect(parseTimeRange(null)).toBe("7d")
    expect(parseTimeRange("")).toBe("7d")
    expect(parseTimeRange("year")).toBe("7d")
  })
})

describe("resolveStartDate", () => {
  beforeEach(() => {
    vi.useFakeTimers()
    vi.setSystemTime(FIXED_NOW)
  })

  afterEach(() => {
    vi.useRealTimers()
  })

  it("uses start of local day for today", () => {
    const start = resolveStartDate("today")
    const expected = new Date(FIXED_NOW)
    expected.setHours(0, 0, 0, 0)
    expect(start.getTime()).toBe(expected.getTime())
  })

  it("uses rolling 7 days for 7d", () => {
    const start = resolveStartDate("7d")
    const expected = new Date(FIXED_NOW.getTime() - 7 * 24 * 60 * 60 * 1000)
    expect(start.getTime()).toBe(expected.getTime())
  })

  it("uses rolling 30 days for 30d", () => {
    const start = resolveStartDate("30d")
    const expected = new Date(FIXED_NOW.getTime() - 30 * 24 * 60 * 60 * 1000)
    expect(start.getTime()).toBe(expected.getTime())
>>>>>>> Stashed changes
  })
})
