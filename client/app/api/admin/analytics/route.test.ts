import { NextResponse } from "next/server"
import { beforeEach, describe, expect, it, vi } from "vitest"

vi.mock("@/lib/auth/require-admin", () => ({
  requireAdmin: vi.fn(),
}))

vi.mock("@/lib/prisma", () => ({
  prisma: {
    foodItem: {
      count: vi.fn(),
      groupBy: vi.fn(),
    },
    usedItem: {
      count: vi.fn(),
    },
    wastedItem: {
      count: vi.fn(),
      groupBy: vi.fn(),
      findMany: vi.fn(),
    },
    receipt: {
      count: vi.fn(),
    },
    category: {
      findMany: vi.fn(),
    },
  },
}))

import { GET } from "./route"
import { requireAdmin } from "@/lib/auth/require-admin"
import { prisma } from "@/lib/prisma"

const requireAdminMock = vi.mocked(requireAdmin)
const foodItemCountMock = vi.mocked(prisma.foodItem.count)
const foodItemGroupByMock = vi.mocked(prisma.foodItem.groupBy)
const usedItemCountMock = vi.mocked(prisma.usedItem.count)
const wastedItemCountMock = vi.mocked(prisma.wastedItem.count)
const wastedItemGroupByMock = vi.mocked(prisma.wastedItem.groupBy)
const wastedItemFindManyMock = vi.mocked(prisma.wastedItem.findMany)
const receiptCountMock = vi.mocked(prisma.receipt.count)
const categoryFindManyMock = vi.mocked(prisma.category.findMany)

function mockEmptyData() {
  foodItemCountMock.mockResolvedValue(0 as never)
  foodItemGroupByMock.mockResolvedValue([] as never)
  usedItemCountMock.mockResolvedValue(0 as never)
  wastedItemCountMock.mockResolvedValue(0 as never)
  wastedItemGroupByMock.mockResolvedValue([] as never)
  wastedItemFindManyMock.mockResolvedValue([] as never)
  receiptCountMock.mockResolvedValue(0 as never)
  categoryFindManyMock.mockResolvedValue([] as never)
}

describe("GET /api/admin/analytics", () => {
  beforeEach(() => {
    vi.resetAllMocks()
  })

  // ── Auth Tests ──────────────────────────────────────────

  it("returns 401 when user is not authenticated", async () => {
    requireAdminMock.mockResolvedValue({
      ok: false,
      response: NextResponse.json({ error: "Unauthorized." }, { status: 401 }),
    })

    const response = await GET(new Request("http://localhost/api/admin/analytics"))
    expect(response.status).toBe(401)
  })

  it("returns 403 when user is not an admin", async () => {
    requireAdminMock.mockResolvedValue({
      ok: false,
      response: NextResponse.json({ error: "Forbidden." }, { status: 403 }),
    })

    const response = await GET(new Request("http://localhost/api/admin/analytics"))
    expect(response.status).toBe(403)
  })

  // ── Default Response Tests ──────────────────────────────

  it("returns 200 with analytics data for valid admin request", async () => {
    requireAdminMock.mockResolvedValue({ ok: true })
    foodItemCountMock.mockResolvedValue(100 as never)
    foodItemGroupByMock.mockResolvedValue([
      { categoryId: "cat1", _count: { id: 50 } },
    ] as never)
    usedItemCountMock.mockResolvedValue(30 as never)
    wastedItemCountMock.mockResolvedValue(10 as never)
    wastedItemGroupByMock.mockResolvedValue([
      { categoryId: "cat1", _count: { id: 10 }, _sum: { quantity: 15 } },
    ] as never)
    wastedItemFindManyMock.mockResolvedValue([
      {
        id: "w1",
        name: "Milk",
        quantity: 1,
        markedWastedAt: new Date("2026-04-01"),
        category: { name: "Dairy" },
      },
    ] as never)
    receiptCountMock.mockResolvedValue(5 as never)
    categoryFindManyMock.mockResolvedValue([
      { id: "cat1", name: "Dairy" },
    ] as never)

    const response = await GET(new Request("http://localhost/api/admin/analytics"))
    expect(response.status).toBe(200)

    const body = await response.json()

    expect(body.range).toBe("7d")
    expect(body.summary).toMatchObject({
      totalItems: 100,
      activeItems: 100,
      usedItems: 30,
      wastedItems: 10,
      receiptCount: 5,
    })
    expect(body.generatedAt).toBeDefined()
  })

  // ── Waste Rate Calculation Tests ────────────────────────

  it("calculates waste rate correctly when items are disposed", async () => {
    requireAdminMock.mockResolvedValue({ ok: true })
    foodItemCountMock.mockResolvedValue(50 as never)
    foodItemGroupByMock.mockResolvedValue([] as never)
    usedItemCountMock.mockResolvedValue(60 as never)
    wastedItemCountMock.mockResolvedValue(40 as never)
    wastedItemGroupByMock.mockResolvedValue([] as never)
    wastedItemFindManyMock.mockResolvedValue([] as never)
    receiptCountMock.mockResolvedValue(0 as never)
    categoryFindManyMock.mockResolvedValue([] as never)

    const response = await GET(new Request("http://localhost/api/admin/analytics"))
    const body = await response.json()

    // 40 / (60 + 40) = 40%
    expect(body.summary.wasteRate).toBe(40)
  })

  it("returns 0 waste rate when no items are disposed", async () => {
    requireAdminMock.mockResolvedValue({ ok: true })
    mockEmptyData()

    const response = await GET(new Request("http://localhost/api/admin/analytics"))
    const body = await response.json()

    expect(body.summary.wasteRate).toBe(0)
  })

  // ── Range Tests ─────────────────────────────────────────

  it('defaults range to "7d" when no range param is provided', async () => {
    requireAdminMock.mockResolvedValue({ ok: true })
    mockEmptyData()

    const response = await GET(new Request("http://localhost/api/admin/analytics"))
    const body = await response.json()

    expect(body.range).toBe("7d")
  })

  it("accepts today range parameter", async () => {
    requireAdminMock.mockResolvedValue({ ok: true })
    mockEmptyData()

    const response = await GET(new Request("http://localhost/api/admin/analytics?range=today"))
    const body = await response.json()

    expect(body.range).toBe("today")
  })

  it("accepts 30d range parameter", async () => {
    requireAdminMock.mockResolvedValue({ ok: true })
    mockEmptyData()

    const response = await GET(new Request("http://localhost/api/admin/analytics?range=30d"))
    const body = await response.json()

    expect(body.range).toBe("30d")
  })

  it('falls back to "7d" for invalid range values', async () => {
    requireAdminMock.mockResolvedValue({ ok: true })
    mockEmptyData()

    const response = await GET(new Request("http://localhost/api/admin/analytics?range=invalid"))
    const body = await response.json()

    expect(body.range).toBe("7d")
  })

  // ── Breakdown Tests ─────────────────────────────────────

  it("returns category breakdown with resolved names", async () => {
    requireAdminMock.mockResolvedValue({ ok: true })
    foodItemCountMock.mockResolvedValue(20 as never)
    foodItemGroupByMock.mockResolvedValue([
      { categoryId: "cat1", _count: { id: 10 } },
      { categoryId: "cat2", _count: { id: 10 } },
    ] as never)
    usedItemCountMock.mockResolvedValue(0 as never)
    wastedItemCountMock.mockResolvedValue(0 as never)
    wastedItemGroupByMock.mockResolvedValue([] as never)
    wastedItemFindManyMock.mockResolvedValue([] as never)
    receiptCountMock.mockResolvedValue(0 as never)
    categoryFindManyMock.mockResolvedValue([
      { id: "cat1", name: "Dairy" },
      { id: "cat2", name: "Produce" },
    ] as never)

    const response = await GET(new Request("http://localhost/api/admin/analytics"))
    const body = await response.json()

    expect(body.breakdown.itemsByCategory).toHaveLength(2)
    expect(body.breakdown.itemsByCategory[0]).toMatchObject({
      categoryId: "cat1",
      categoryName: "Dairy",
      activeCount: 10,
    })
  })

  it("returns waste by category with quantity sums", async () => {
    requireAdminMock.mockResolvedValue({ ok: true })
    foodItemCountMock.mockResolvedValue(0 as never)
    foodItemGroupByMock.mockResolvedValue([] as never)
    usedItemCountMock.mockResolvedValue(0 as never)
    wastedItemCountMock.mockResolvedValue(5 as never)
    wastedItemGroupByMock.mockResolvedValue([
      { categoryId: "cat1", _count: { id: 5 }, _sum: { quantity: 12 } },
    ] as never)
    wastedItemFindManyMock.mockResolvedValue([] as never)
    receiptCountMock.mockResolvedValue(0 as never)
    categoryFindManyMock.mockResolvedValue([
      { id: "cat1", name: "Bakery" },
    ] as never)

    const response = await GET(new Request("http://localhost/api/admin/analytics"))
    const body = await response.json()

    expect(body.breakdown.wasteByCategory).toHaveLength(1)
    expect(body.breakdown.wasteByCategory[0]).toMatchObject({
      categoryName: "Bakery",
      wastedCount: 5,
      wastedQuantity: 12,
    })
  })

  // ── Recent Waste Tests ──────────────────────────────────

  it("returns recent waste items with formatted dates", async () => {
    requireAdminMock.mockResolvedValue({ ok: true })
    foodItemCountMock.mockResolvedValue(0 as never)
    foodItemGroupByMock.mockResolvedValue([] as never)
    usedItemCountMock.mockResolvedValue(0 as never)
    wastedItemCountMock.mockResolvedValue(1 as never)
    wastedItemGroupByMock.mockResolvedValue([] as never)
    wastedItemFindManyMock.mockResolvedValue([
      {
        id: "w1",
        name: "Bread",
        quantity: 2,
        markedWastedAt: new Date("2026-04-03T10:00:00Z"),
        category: { name: "Bakery" },
      },
    ] as never)
    receiptCountMock.mockResolvedValue(0 as never)
    categoryFindManyMock.mockResolvedValue([] as never)

    const response = await GET(new Request("http://localhost/api/admin/analytics"))
    const body = await response.json()

    expect(body.recentWaste).toHaveLength(1)
    expect(body.recentWaste[0]).toMatchObject({
      id: "w1",
      name: "Bread",
      quantity: 2,
      categoryName: "Bakery",
    })
    expect(body.recentWaste[0].markedWastedAt).toBeDefined()
  })

  // ── Empty State Tests ───────────────────────────────────

  it("handles empty database gracefully", async () => {
    requireAdminMock.mockResolvedValue({ ok: true })
    mockEmptyData()

    const response = await GET(new Request("http://localhost/api/admin/analytics"))
    expect(response.status).toBe(200)

    const body = await response.json()

    expect(body.summary.totalItems).toBe(0)
    expect(body.summary.activeItems).toBe(0)
    expect(body.summary.usedItems).toBe(0)
    expect(body.summary.wastedItems).toBe(0)
    expect(body.summary.receiptCount).toBe(0)
    expect(body.summary.wasteRate).toBe(0)
    expect(body.breakdown.itemsByCategory).toEqual([])
    expect(body.breakdown.wasteByCategory).toEqual([])
    expect(body.recentWaste).toEqual([])
  })

  // ── Error Handling Tests ────────────────────────────────

  it("returns 500 when a database error occurs", async () => {
    requireAdminMock.mockResolvedValue({ ok: true })
    foodItemCountMock.mockRejectedValue(new Error("DB connection failed") as never)

    const consoleSpy = vi.spyOn(console, "error").mockImplementation(() => {})
    const response = await GET(new Request("http://localhost/api/admin/analytics"))

    expect(response.status).toBe(500)
    const body = await response.json()
    expect(body.error).toBe("Failed to load analytics data.")

    consoleSpy.mockRestore()
  })
})
