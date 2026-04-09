import { afterEach, beforeEach, describe, expect, it, vi } from "vitest"
import {
  getShelfLife,
  getDaysStored,
  getDaysLeft,
  getNotificationRule,
  buildNotification,
  CATEGORY_SHELF_LIFE,
} from "./notifications"

const FIXED_NOW = new Date("2026-04-07T12:00:00.000Z")

function daysAgo(days: number): Date {
  const d = new Date(FIXED_NOW)
  d.setDate(d.getDate() - days)
  return d
}

describe("notifications lib", () => {
  beforeEach(() => {
    vi.setSystemTime(FIXED_NOW)
  })

  afterEach(() => {
    vi.useRealTimers()
  })

  describe("getShelfLife", () => {
    it("returns the correct shelf life for known categories", () => {
      expect(getShelfLife("Meat")).toBe(3)
      expect(getShelfLife("Dairy")).toBe(10)
      expect(getShelfLife("Produce")).toBe(7)
      expect(getShelfLife("Frozen")).toBe(90)
    })

    it("returns 7 as default for unknown categories", () => {
      expect(getShelfLife("Unknown")).toBe(7)
      expect(getShelfLife("")).toBe(7)
    })
  })

  describe("getDaysStored", () => {
    it("returns 0 when item was added today", () => {
      expect(getDaysStored(FIXED_NOW)).toBe(0)
    })

    it("returns correct days when item was added in the past", () => {
      expect(getDaysStored(daysAgo(5))).toBe(5)
      expect(getDaysStored(daysAgo(30))).toBe(30)
    })
  })

  describe("getDaysLeft", () => {
    it("returns full shelf life when item was just added", () => {
      expect(getDaysLeft(FIXED_NOW, "Meat")).toBe(3)
      expect(getDaysLeft(FIXED_NOW, "Dairy")).toBe(10)
    })

    it("returns 0 when item has expired", () => {
      expect(getDaysLeft(daysAgo(10), "Meat")).toBe(0)
    })

    it("returns remaining days correctly", () => {
      // Dairy: 10 days shelf life, added 6 days ago → 4 days left
      expect(getDaysLeft(daysAgo(6), "Dairy")).toBe(4)
    })
  })

  describe("getNotificationRule", () => {
    it("returns warning when daysLeft is 0 (expired)", () => {
      expect(getNotificationRule(0, 10)).toBe("warning")
    })

    it("returns reminder when within 25% of shelf life", () => {
      // Meat: shelf life 3, 25% = 1 → daysLeft 1 = reminder
      expect(getNotificationRule(1, 3)).toBe("reminder")
    })

    it("returns info when within 50% of shelf life", () => {
      // Dairy: shelf life 10, 50% = 5 → daysLeft 4 = info (between 25% and 50%)
      expect(getNotificationRule(4, 10)).toBe("info")
    })

    it("returns null when item still has plenty of time", () => {
      // Pantry: shelf life 60, added 1 day ago → 59 days left → null
      expect(getNotificationRule(59, 60)).toBeNull()
    })
  })

  describe("buildNotification", () => {
    it("returns null for a fresh item", () => {
      const result = buildNotification({
        id: "item-1",
        name: "Rice",
        dateAdded: daysAgo(1),
        categoryName: "Pantry",
      })
      expect(result).toBeNull()
    })

    it("builds a warning notification for an expired item", () => {
      const result = buildNotification({
        id: "item-2",
        name: "Chicken",
        dateAdded: daysAgo(10),
        categoryName: "Meat",
      })
      expect(result).not.toBeNull()
      expect(result!.type).toBe("warning")
      expect(result!.id).toBe("expired-item-2")
      expect(result!.message).toMatch(/expired/i)
      expect(result!.read).toBe(false)
    })

    it("builds a reminder notification for item expiring very soon", () => {
      // Meat: shelf life 3, added 2 days ago → 1 day left → reminder
      const result = buildNotification({
        id: "item-3",
        name: "Salmon",
        dateAdded: daysAgo(2),
        categoryName: "Meat",
      })
      expect(result).not.toBeNull()
      expect(result!.type).toBe("reminder")
      expect(result!.id).toBe("use-first-item-3")
      expect(result!.message).toMatch(/1 day/i)
    })

    it("builds an info notification for item approaching use-by", () => {
      // Dairy: shelf life 10, added 6 days ago → 4 days left → info
      const result = buildNotification({
        id: "item-4",
        name: "Yogurt",
        dateAdded: daysAgo(6),
        categoryName: "Dairy",
      })
      expect(result).not.toBeNull()
      expect(result!.type).toBe("info")
      expect(result!.id).toBe("use-soon-item-4")
      expect(result!.message).toMatch(/4 days/i)
    })

    it("includes a valid ISO timestamp", () => {
      const result = buildNotification({
        id: "item-5",
        name: "Chicken",
        dateAdded: daysAgo(10),
        categoryName: "Meat",
      })
      expect(result!.timestamp).toBe(FIXED_NOW.toISOString())
    })
  })

  describe("CATEGORY_SHELF_LIFE", () => {
    it("has entries for all expected categories", () => {
      const expected = [
        "Produce", "Meat", "Seafood", "Dairy", "Bakery",
        "Frozen", "Pantry", "Beverage", "Snacks", "Leftover", "Other",
      ]
      for (const category of expected) {
        expect(CATEGORY_SHELF_LIFE[category]).toBeGreaterThan(0)
      }
    })
  })
})
