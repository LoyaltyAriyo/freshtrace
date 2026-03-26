import { describe, it, expect, beforeEach, afterEach, vi } from "vitest"
import {
  getDaysStored,
  getDaysLeft,
  formatTimeLeft,
  formatRelativeTime,
  getShelfLifeDays,
  getExpiryUrgency,
  PRIORITIES,
} from "../data"

const FIXED_NOW = new Date("2026-03-21T12:00:00.000Z")

function daysAgoStr(days: number): string {
  const d = new Date(FIXED_NOW)
  d.setDate(d.getDate() - days)
  return d.toISOString()
}

describe("priority display functions", () => {
  beforeEach(() => {
    vi.useFakeTimers()
    vi.setSystemTime(FIXED_NOW)
  })

  afterEach(() => {
    vi.useRealTimers()
  })

  // ---------------------------------------------------------------------------
  // PRIORITIES constant — display labels
  // ---------------------------------------------------------------------------

  describe("PRIORITIES display labels", () => {
    it("has correct label for use-first", () => {
      const p = PRIORITIES.find((p) => p.value === "use-first")
      expect(p?.label).toBe("Use First")
    })

    it("has correct label for use-soon", () => {
      const p = PRIORITIES.find((p) => p.value === "use-soon")
      expect(p?.label).toBe("Use Soon")
    })

    it("has correct label for use-later", () => {
      const p = PRIORITIES.find((p) => p.value === "use-later")
      expect(p?.label).toBe("Use Later")
    })
  })

  // ---------------------------------------------------------------------------
  // getDaysStored
  // ---------------------------------------------------------------------------

  describe("getDaysStored", () => {
    it("returns 0 when added today", () => {
      expect(getDaysStored(FIXED_NOW.toISOString())).toBe(0)
    })

    it("returns correct days for a past date", () => {
      expect(getDaysStored(daysAgoStr(5))).toBe(5)
    })
  })

  // ---------------------------------------------------------------------------
  // formatRelativeTime — used in display to show when item was added
  // ---------------------------------------------------------------------------

  describe("formatRelativeTime", () => {
    it("returns 'Today' when added today", () => {
      expect(formatRelativeTime(daysAgoStr(0))).toBe("Today")
    })

    it("returns 'Yesterday' when added 1 day ago", () => {
      expect(formatRelativeTime(daysAgoStr(1))).toBe("Yesterday")
    })

    it("returns 'X days ago' for older items", () => {
      expect(formatRelativeTime(daysAgoStr(5))).toBe("5 days ago")
    })
  })

  // ---------------------------------------------------------------------------
  // getShelfLifeDays — shelf life lookup by item name + category
  // ---------------------------------------------------------------------------

  describe("getShelfLifeDays", () => {
    it("returns 2 days for chicken (meat)", () => {
      expect(getShelfLifeDays("Chicken Breast", "meat")).toBe(2)
    })

    it("returns 7 days for milk (dairy)", () => {
      expect(getShelfLifeDays("Whole Milk", "dairy")).toBe(7)
    })

    it("returns 4 days for leftover pasta (leftovers)", () => {
      expect(getShelfLifeDays("Leftover Pasta", "leftovers")).toBe(4)
    })

    it("returns 5 days for strawberries (produce)", () => {
      expect(getShelfLifeDays("Strawberries", "produce")).toBe(5)
    })

    it("falls back to category shelf life for unknown items", () => {
      expect(getShelfLifeDays("Mystery Food", "produce")).toBe(7)
      expect(getShelfLifeDays("Mystery Food", "dairy")).toBe(14)
      expect(getShelfLifeDays("Mystery Food", "leftovers")).toBe(4)
    })
  })

  // ---------------------------------------------------------------------------
  // getDaysLeft — returns 0 when expired (not negative)
  // ---------------------------------------------------------------------------

  describe("getDaysLeft", () => {
    it("returns full shelf life when added today", () => {
      expect(getDaysLeft(daysAgoStr(0), "Chicken Breast", "meat")).toBe(2)
    })

    it("returns 0 when item is expired (does not go negative)", () => {
      // chicken shelf life is 2 days, added 5 days ago
      expect(getDaysLeft(daysAgoStr(5), "Chicken Breast", "meat")).toBe(0)
    })

    it("returns remaining days mid shelf life", () => {
      // milk shelf life is 7 days, added 3 days ago → 4 days left
      expect(getDaysLeft(daysAgoStr(3), "Whole Milk", "dairy")).toBe(4)
    })
  })

  // ---------------------------------------------------------------------------
  // formatTimeLeft — display text in priority cards
  // ---------------------------------------------------------------------------

  describe("formatTimeLeft", () => {
    it("shows 'Expired' when 0 days left", () => {
      expect(formatTimeLeft(0)).toBe("Expired")
    })

    it("shows '1 day left' for 1 day", () => {
      expect(formatTimeLeft(1)).toBe("1 day left")
    })

    it("shows 'X days left' for 2-6 days", () => {
      expect(formatTimeLeft(3)).toBe("3 days left")
      expect(formatTimeLeft(6)).toBe("6 days left")
    })

    it("shows '1 week left' for 7-13 days", () => {
      expect(formatTimeLeft(7)).toBe("1 week left")
      expect(formatTimeLeft(13)).toBe("1 week left")
    })

    it("shows 'X weeks left' for 14-29 days", () => {
      expect(formatTimeLeft(14)).toBe("2 weeks left")
      expect(formatTimeLeft(21)).toBe("3 weeks left")
    })

    it("shows '1 month left' for 30-59 days", () => {
      expect(formatTimeLeft(30)).toBe("1 month left")
    })

    it("shows 'X months left' for 60-364 days", () => {
      expect(formatTimeLeft(60)).toBe("2 months left")
      expect(formatTimeLeft(90)).toBe("3 months left")
    })

    it("shows '1 year left' for 365+ days", () => {
      expect(formatTimeLeft(365)).toBe("1 year left")
    })
  })

  // ---------------------------------------------------------------------------
  // getExpiryUrgency — controls color/style of expiry text in display
  // ---------------------------------------------------------------------------

  describe("getExpiryUrgency", () => {
    it("returns 'expired' when 0 days left", () => {
      expect(getExpiryUrgency(0, 7)).toBe("expired")
    })

    it("returns 'critical' when ≤15% of shelf life remains", () => {
      // 1 day left out of 7 = 14%
      expect(getExpiryUrgency(1, 7)).toBe("critical")
    })

    it("returns 'warning' when ≤35% of shelf life remains", () => {
      // 2 days left out of 7 = 28%
      expect(getExpiryUrgency(2, 7)).toBe("warning")
    })

    it("returns 'ok' when ≤60% of shelf life remains", () => {
      // 4 days left out of 7 = 57%
      expect(getExpiryUrgency(4, 7)).toBe("ok")
    })

    it("returns 'fresh' when >60% of shelf life remains", () => {
      // 6 days left out of 7 = 86%
      expect(getExpiryUrgency(6, 7)).toBe("fresh")
    })

    it("returns correct urgency for leftovers (4 day shelf life)", () => {
      // leftover with 1 day left = 25% → warning
      expect(getExpiryUrgency(1, 4)).toBe("warning")
      // leftover with 3 days left = 75% → fresh
      expect(getExpiryUrgency(3, 4)).toBe("fresh")
    })
  })
})
