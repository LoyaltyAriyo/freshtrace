import { afterEach, beforeEach, describe, expect, it, vi } from "vitest"

vi.mock("@/lib/prisma", () => {
  const userCount = vi.fn()
  const receiptCount = vi.fn()
  const foodItemCount = vi.fn()
  const wastedItemCount = vi.fn()
  const usedItemCount = vi.fn()
  const categoryFindMany = vi.fn()

  return {
    prisma: {
      user: { count: userCount },
      receipt: { count: receiptCount },
      foodItem: { count: foodItemCount },
      wastedItem: { count: wastedItemCount },
      usedItem: { count: usedItemCount },
      category: { findMany: categoryFindMany },
    },
    userCount,
    receiptCount,
    foodItemCount,
    wastedItemCount,
    usedItemCount,
    categoryFindMany,
  }
})

import { GET } from "./route"
// @ts-expect-error - test-only mocked exports
import { userCount, receiptCount, foodItemCount, wastedItemCount, usedItemCount, categoryFindMany } from "@/lib/prisma"

const FIXED_NOW = new Date("2026-04-13T12:00:00.000Z")

const DEFAULT_CATEGORIES = [
  { name: "Produce", _count: { foodItems: 50 } },
  { name: "Dairy", _count: { foodItems: 30 } },
  { name: "Meat", _count: { foodItems: 20 } },
]

function setupMocks(overrides: Partial<{
  users: number
  receipts: number
  foodItems: number
  wasted: number
  used: number
}> = {}) {
  userCount.mockResolvedValue(overrides.users ?? 10)
  receiptCount.mockResolvedValue(overrides.receipts ?? 5)
  foodItemCount.mockResolvedValue(overrides.foodItems ?? 20)
  wastedItemCount.mockResolvedValue(overrides.wasted ?? 3)
  usedItemCount.mockResolvedValue(overrides.used ?? 7)
  categoryFindMany.mockResolvedValue(DEFAULT_CATEGORIES)
}

describe("GET /api/analytics", () => {
  beforeEach(() => {
    vi.setSystemTime(FIXED_NOW)
    setupMocks()
  })

  afterEach(() => {
    vi.useRealTimers()
    vi.resetAllMocks()
  })

  it("returns 200 with analytics data for default range (7d)", async () => {
    const request = new Request("http://localhost/api/analytics")
    const response = await GET(request)
    const body = await response.json()

    expect(response.status).toBe(200)
    expect(body.range).toBe("7d")
    expect(body.activeUsers).toBe(10)
    expect(body.totalReceipts).toBe(5)
    expect(body.activeFoodItems).toBe(20)
    expect(body.wastedItems).toBe(3)
    expect(body.usedItems).toBe(7)
    expect(body.topCategories).toHaveLength(3)
  })

  it("returns correct data for today range", async () => {
    const request = new Request("http://localhost/api/analytics?range=today")
    const response = await GET(request)
    const body = await response.json()

    expect(response.status).toBe(200)
    expect(body.range).toBe("today")
  })

  it("returns correct data for 30d range", async () => {
    const request = new Request("http://localhost/api/analytics?range=30d")
    const response = await GET(request)
    const body = await response.json()

    expect(response.status).toBe(200)
    expect(body.range).toBe("30d")
  })

  it("returns top categories formatted correctly", async () => {
    const request = new Request("http://localhost/api/analytics")
    const response = await GET(request)
    const body = await response.json()

    expect(body.topCategories[0]).toEqual({ name: "Produce", count: 50 })
    expect(body.topCategories[1]).toEqual({ name: "Dairy", count: 30 })
    expect(body.topCategories[2]).toEqual({ name: "Meat", count: 20 })
  })

  it("returns 500 when database query fails", async () => {
    userCount.mockRejectedValue(new Error("DB error"))

    const request = new Request("http://localhost/api/analytics")
    const response = await GET(request)
    const body = await response.json()

    expect(response.status).toBe(500)
    expect(body.error).toMatch(/failed to fetch analytics/i)
  })
})
