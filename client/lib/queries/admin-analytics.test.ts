import { afterEach, beforeEach, describe, expect, it, vi } from "vitest"

const prismaMocks = vi.hoisted(() => {
  return {
    foodItemCount: vi.fn(),
    foodItemGroupBy: vi.fn(),
    usedItemCount: vi.fn(),
    wastedItemCount: vi.fn(),
    wastedItemGroupBy: vi.fn(),
    wastedItemFindMany: vi.fn(),
    receiptCount: vi.fn(),
    categoryFindMany: vi.fn(),
  }
})

vi.mock("@/lib/prisma", () => ({
  prisma: {
    foodItem: {
      count: prismaMocks.foodItemCount,
      groupBy: prismaMocks.foodItemGroupBy,
    },
    usedItem: { count: prismaMocks.usedItemCount },
    wastedItem: {
      count: prismaMocks.wastedItemCount,
      groupBy: prismaMocks.wastedItemGroupBy,
      findMany: prismaMocks.wastedItemFindMany,
    },
    receipt: { count: prismaMocks.receiptCount },
    category: { findMany: prismaMocks.categoryFindMany },
  },
}))

import { getAdminAnalyticsReport } from "./admin-analytics"

const {
  foodItemCount,
  foodItemGroupBy,
  usedItemCount,
  wastedItemCount,
  wastedItemGroupBy,
  wastedItemFindMany,
  receiptCount,
  categoryFindMany,
} = prismaMocks

const FIXED_NOW = new Date("2026-04-13T12:00:00.000Z")

function resetMocks() {
  foodItemCount.mockReset()
  foodItemGroupBy.mockReset()
  usedItemCount.mockReset()
  wastedItemCount.mockReset()
  wastedItemGroupBy.mockReset()
  wastedItemFindMany.mockReset()
  receiptCount.mockReset()
  categoryFindMany.mockReset()
}

function setupHappyPath() {
  foodItemCount.mockResolvedValueOnce(100).mockResolvedValueOnce(40)
  usedItemCount.mockResolvedValue(30)
  wastedItemCount.mockResolvedValue(10)
  receiptCount.mockResolvedValue(5)
  foodItemGroupBy.mockResolvedValue([{ categoryId: "c1", _count: { id: 20 } }])
  wastedItemGroupBy.mockResolvedValue([
    { categoryId: "c1", _count: { id: 4 }, _sum: { quantity: 6 } },
  ])
  wastedItemFindMany.mockResolvedValue([
    {
      id: "w1",
      name: "Lettuce",
      quantity: 1,
      markedWastedAt: new Date("2026-04-10T10:00:00.000Z"),
      category: { name: "Produce" },
    },
  ])
  categoryFindMany.mockResolvedValue([{ id: "c1", name: "Produce" }])
}

describe("getAdminAnalyticsReport", () => {
  beforeEach(() => {
    vi.useFakeTimers()
    vi.setSystemTime(FIXED_NOW)
    resetMocks()
    setupHappyPath()
  })

  afterEach(() => {
    vi.useRealTimers()
  })

  it("returns summary matching prisma counts and computed wasteRate", async () => {
    const result = await getAdminAnalyticsReport("7d")

    expect(result.range).toBe("7d")
    expect(result.summary).toEqual({
      totalItems: 100,
      activeItems: 40,
      usedItems: 30,
      wastedItems: 10,
      receiptCount: 5,
      wasteRate: 25,
    })
  })

  it("computes wasteRate as 0 when nothing was used or wasted in range", async () => {
    resetMocks()
    foodItemCount.mockResolvedValueOnce(0).mockResolvedValueOnce(0)
    usedItemCount.mockResolvedValue(0)
    wastedItemCount.mockResolvedValue(0)
    receiptCount.mockResolvedValue(0)
    foodItemGroupBy.mockResolvedValue([])
    wastedItemGroupBy.mockResolvedValue([])
    wastedItemFindMany.mockResolvedValue([])
    categoryFindMany.mockResolvedValue([])

    const result = await getAdminAnalyticsReport("7d")

    expect(result.summary.wasteRate).toBe(0)
  })

  it("computes wasteRate rounded to two decimal places", async () => {
    resetMocks()
    foodItemCount.mockResolvedValueOnce(10).mockResolvedValueOnce(5)
    usedItemCount.mockResolvedValue(3)
    wastedItemCount.mockResolvedValue(2)
    receiptCount.mockResolvedValue(1)
    foodItemGroupBy.mockResolvedValue([])
    wastedItemGroupBy.mockResolvedValue([])
    wastedItemFindMany.mockResolvedValue([])
    categoryFindMany.mockResolvedValue([])

    const result = await getAdminAnalyticsReport("7d")

    expect(result.summary.wasteRate).toBe(40)
  })

  it("rounds wasteRate to two decimals for non-integer ratios", async () => {
    resetMocks()
    foodItemCount.mockResolvedValueOnce(1).mockResolvedValueOnce(1)
    usedItemCount.mockResolvedValue(2)
    wastedItemCount.mockResolvedValue(1)
    receiptCount.mockResolvedValue(0)
    foodItemGroupBy.mockResolvedValue([])
    wastedItemGroupBy.mockResolvedValue([])
    wastedItemFindMany.mockResolvedValue([])
    categoryFindMany.mockResolvedValue([])

    const result = await getAdminAnalyticsReport("7d")

    expect(result.summary.wasteRate).toBe(33.33)
  })

  it("applies start-of-day filter for today range on receipt count", async () => {
    await getAdminAnalyticsReport("today")

    const expectedStart = new Date(FIXED_NOW)
    expectedStart.setHours(0, 0, 0, 0)

    expect(receiptCount).toHaveBeenCalledWith({
      where: { uploadedAt: { gte: expectedStart } },
    })
  })

  it("applies 7-day window on wasted item count", async () => {
    await getAdminAnalyticsReport("7d")

    const expectedStart = new Date(FIXED_NOW.getTime() - 7 * 24 * 60 * 60 * 1000)

    expect(wastedItemCount).toHaveBeenCalledWith({
      where: { markedWastedAt: { gte: expectedStart } },
    })
  })

  it("applies 30-day window on used items", async () => {
    await getAdminAnalyticsReport("30d")

    const expectedStart = new Date(FIXED_NOW.getTime() - 30 * 24 * 60 * 60 * 1000)

    expect(usedItemCount).toHaveBeenCalledWith({
      where: { markedUsedAt: { gte: expectedStart } },
    })
  })

  it("scopes recent waste query to range and orders by markedWastedAt desc", async () => {
    const expectedStart = new Date(FIXED_NOW.getTime() - 7 * 24 * 60 * 60 * 1000)

    await getAdminAnalyticsReport("7d")

    expect(wastedItemFindMany).toHaveBeenCalledWith({
      where: { markedWastedAt: { gte: expectedStart } },
      orderBy: { markedWastedAt: "desc" },
      take: 10,
      select: {
        id: true,
        name: true,
        quantity: true,
        markedWastedAt: true,
        category: { select: { name: true } },
      },
    })
  })

  it("maps breakdown category names and recent waste ISO timestamps (report display shape)", async () => {
    const result = await getAdminAnalyticsReport("7d")

    expect(result.breakdown.itemsByCategory[0]).toEqual({
      categoryId: "c1",
      categoryName: "Produce",
      activeCount: 20,
    })
    expect(result.breakdown.wasteByCategory[0]).toMatchObject({
      categoryName: "Produce",
      wastedQuantity: 6,
    })
    expect(result.recentWaste[0]).toEqual({
      id: "w1",
      name: "Lettuce",
      quantity: 1,
      categoryName: "Produce",
      markedWastedAt: "2026-04-10T10:00:00.000Z",
    })
  })

  it("uses Unknown when category id is missing from lookup", async () => {
    resetMocks()
    foodItemCount.mockResolvedValueOnce(1).mockResolvedValueOnce(1)
    usedItemCount.mockResolvedValue(0)
    wastedItemCount.mockResolvedValue(0)
    receiptCount.mockResolvedValue(0)
    foodItemGroupBy.mockResolvedValue([{ categoryId: "orphan", _count: { id: 1 } }])
    wastedItemGroupBy.mockResolvedValue([])
    wastedItemFindMany.mockResolvedValue([])
    categoryFindMany.mockResolvedValue([])

    const result = await getAdminAnalyticsReport("7d")

    expect(result.breakdown.itemsByCategory[0].categoryName).toBe("Unknown")
  })
})
