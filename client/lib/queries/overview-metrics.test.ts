import { afterEach, beforeEach, describe, expect, it, vi } from "vitest"

import { parseTimeRange, resolveStartDate } from "./overview-metrics"

const FIXED_NOW = new Date("2026-04-13T15:30:00.000Z")

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
  beforeEach(() => {
    vi.useFakeTimers()
    vi.setSystemTime(FIXED_NOW)
  })

  afterEach(() => {
    vi.useRealTimers()
  })

  it('returns start of today for "today" range', () => {
    const start = resolveStartDate("today")
    const expected = new Date(FIXED_NOW)
    expected.setHours(0, 0, 0, 0)
    expect(start.getTime()).toBe(expected.getTime())
  })

  it('returns a date ~7 days ago for "7d" range', () => {
    const start = resolveStartDate("7d")
    const expected = new Date(FIXED_NOW.getTime() - 7 * 24 * 60 * 60 * 1000)
    expect(start.getTime()).toBe(expected.getTime())
  })

  it('returns a date ~30 days ago for "30d" range', () => {
    const start = resolveStartDate("30d")
    const expected = new Date(FIXED_NOW.getTime() - 30 * 24 * 60 * 60 * 1000)
    expect(start.getTime()).toBe(expected.getTime())
  })
})
