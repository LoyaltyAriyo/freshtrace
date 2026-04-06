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
  })
})
