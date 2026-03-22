import { describe, it, expect, beforeEach, afterEach, vi } from "vitest"
import {
  getDaysStored,
  getDaysLeft,
  calculatePriority,
  getExpiryUrgency,
  formatTimeLeft,
} from "../priority"

const FIXED_NOW = new Date("2026-03-21T12:00:00.000Z")

function daysAgo(days: number): Date {
  const d = new Date(FIXED_NOW)
  d.setDate(d.getDate() - days)
  return d
}

describe("priority rules engine", () => {
  beforeEach(() => {
    vi.useFakeTimers()
    vi.setSystemTime(FIXED_NOW)
  })

  afterEach(() => {
    vi.useRealTimers()
  })

  // ---------------------------------------------------------------------------
  // getDaysStored
  // ---------------------------------------------------------------------------

  describe("getDaysStored", () => {
    it("returns 0 when added today", () => {
      expect(getDaysStored(FIXED_NOW)).toBe(0)
    })

    it("returns correct days for past dates", () => {
      expect(getDaysStored(daysAgo(5))).toBe(5)
      expect(getDaysStored(daysAgo(10))).toBe(10)
    })

    it("accepts a date string", () => {
      expect(getDaysStored(daysAgo(3).toISOString())).toBe(3)
    })
  })

  // ---------------------------------------------------------------------------
  // getDaysLeft
  // ---------------------------------------------------------------------------

  describe("getDaysLeft", () => {
    it("returns full shelf life when added today", () => {
      expect(getDaysLeft(FIXED_NOW, 7)).toBe(7)
    })

    it("returns correct days left mid shelf life", () => {
      expect(getDaysLeft(daysAgo(3), 7)).toBe(4)
    })

    it("returns 0 on expiry day", () => {
      expect(getDaysLeft(daysAgo(7), 7)).toBe(0)
    })

    it("returns negative when expired", () => {
      expect(getDaysLeft(daysAgo(10), 7)).toBe(-3)
    })
  })

  // ---------------------------------------------------------------------------
  // calculatePriority
  // ---------------------------------------------------------------------------

  describe("calculatePriority", () => {
    it("returns use-later when item is fresh (>66% remaining)", () => {
      // added 1 day ago, shelf life 7 days → 6/7 = 86% remaining
      expect(calculatePriority(daysAgo(1), 7)).toBe("use-later")
    })

    it("returns use-soon when 34-66% of shelf life remains", () => {
      // added 3 days ago, shelf life 7 days → 4/7 = 57% remaining
      expect(calculatePriority(daysAgo(3), 7)).toBe("use-soon")
    })

    it("returns use-first when ≤33% of shelf life remains", () => {
      // added 5 days ago, shelf life 7 days → 2/7 = 29% remaining
      expect(calculatePriority(daysAgo(5), 7)).toBe("use-first")
    })

    it("returns use-first when item is expired", () => {
      expect(calculatePriority(daysAgo(10), 7)).toBe("use-first")
    })

    it("returns use-first when shelf life is 0", () => {
      expect(calculatePriority(FIXED_NOW, 0)).toBe("use-first")
    })

    it("returns use-first on expiry day", () => {
      expect(calculatePriority(daysAgo(7), 7)).toBe("use-first")
    })
  })

  // ---------------------------------------------------------------------------
  // getExpiryUrgency
  // ---------------------------------------------------------------------------

  describe("getExpiryUrgency", () => {
    it("returns expired when daysLeft is negative", () => {
      expect(getExpiryUrgency(-1, 7)).toBe("expired")
    })

    it("returns critical when 1 day left", () => {
      expect(getExpiryUrgency(1, 7)).toBe("critical")
    })

    it("returns warning when ≤33% remaining", () => {
      expect(getExpiryUrgency(2, 7)).toBe("warning")
    })

    it("returns ok when 34-66% remaining", () => {
      expect(getExpiryUrgency(4, 7)).toBe("ok")
    })

    it("returns fresh when >66% remaining", () => {
      expect(getExpiryUrgency(6, 7)).toBe("fresh")
    })
  })

  // ---------------------------------------------------------------------------
  // formatTimeLeft
  // ---------------------------------------------------------------------------

  describe("formatTimeLeft", () => {
    it("formats expired items", () => {
      expect(formatTimeLeft(-3)).toBe("Expired 3d ago")
    })

    it("formats expiry today", () => {
      expect(formatTimeLeft(0)).toBe("Expires today")
    })

    it("formats 1 day left", () => {
      expect(formatTimeLeft(1)).toBe("1 day left")
    })

    it("formats multiple days left", () => {
      expect(formatTimeLeft(5)).toBe("5 days left")
    })
  })
})
