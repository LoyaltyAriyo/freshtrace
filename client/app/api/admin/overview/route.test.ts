import { beforeEach, describe, expect, it, vi } from "vitest"

vi.mock("@/lib/auth", () => ({
  getCurrentUserId: vi.fn(),
}))

vi.mock("@/lib/prisma", () => ({
  prisma: {
    user: {
      findUnique: vi.fn(),
    },
  },
}))

vi.mock("@/lib/queries/overview-metrics", () => ({
  parseTimeRange: vi.fn(),
  getOverviewMetrics: vi.fn(),
}))

vi.mock("@/lib/queries/extended-metrics", () => ({
  getExtendedMetrics: vi.fn(),
}))

import { GET } from "./route"
import { getCurrentUserId } from "@/lib/auth"
import { prisma } from "@/lib/prisma"
import { getOverviewMetrics, parseTimeRange } from "@/lib/queries/overview-metrics"
import { getExtendedMetrics } from "@/lib/queries/extended-metrics"

const getCurrentUserIdMock = vi.mocked(getCurrentUserId)
const findUniqueMock = vi.mocked(prisma.user.findUnique)
const parseTimeRangeMock = vi.mocked(parseTimeRange)
const getOverviewMetricsMock = vi.mocked(getOverviewMetrics)
const getExtendedMetricsMock = vi.mocked(getExtendedMetrics)

const defaultMetrics = {
  totalHouseholds: 0,
  activeUsers: 5,
  activeFoodItems: 20,
  receiptUploads: 3,
  usedItemsCount: 10,
  wastedItemsCount: 2,
  wasteRate: 16.67,
}

const defaultExtended = {
  categoryBreakdown: [
    { categoryId: "c1", categoryName: "Dairy", activeCount: 5, usedCount: 3, wastedCount: 1, totalQuantity: 10 },
  ],
  sourceDistribution: { receipt: 12, manual: 8 },
  topWastedItems: [
    { name: "Milk", categoryName: "Dairy", quantity: 1, markedWastedAt: "2026-04-01T00:00:00.000Z" },
  ],
  dailyTrends: [
    { date: "2026-04-01", usedCount: 2, wastedCount: 1 },
  ],
}

describe("GET /api/admin/overview", () => {
  beforeEach(() => {
    vi.resetAllMocks()
    parseTimeRangeMock.mockReturnValue("7d")
  })

  // ── Auth Tests ──────────────────────────────────────────

  it("returns 401 when user is not authenticated", async () => {
    getCurrentUserIdMock.mockResolvedValue(null)

    const response = await GET(new Request("http://localhost/api/admin/overview"))
    expect(response.status).toBe(401)
  })

  it("returns 401 when user is not found in database", async () => {
    getCurrentUserIdMock.mockResolvedValue("u1")
    findUniqueMock.mockResolvedValue(null)

    const response = await GET(new Request("http://localhost/api/admin/overview"))
    expect(response.status).toBe(401)
  })

  it("returns 403 when user is not an admin", async () => {
    getCurrentUserIdMock.mockResolvedValue("u1")
    findUniqueMock.mockResolvedValue({ role: "USER" } as never)

    const response = await GET(new Request("http://localhost/api/admin/overview"))
    expect(response.status).toBe(403)
  })

  // ── Basic Summary Tests ─────────────────────────────────

  it("returns 200 with summary metrics for admin user", async () => {
    getCurrentUserIdMock.mockResolvedValue("admin1")
    findUniqueMock.mockResolvedValue({ role: "ADMIN" } as never)
    getOverviewMetricsMock.mockResolvedValue(defaultMetrics)

    const response = await GET(new Request("http://localhost/api/admin/overview"))
    expect(response.status).toBe(200)

    const body = await response.json()

    expect(body.range).toBe("7d")
    expect(body.summary).toMatchObject({
      activeUsers: 5,
      activeFoodItems: 20,
      receiptUploads: 3,
      wasteRate: 16.67,
    })
    expect(body.generatedAt).toBeDefined()
  })

  it("does not include extended data when detailed param is absent", async () => {
    getCurrentUserIdMock.mockResolvedValue("admin1")
    findUniqueMock.mockResolvedValue({ role: "ADMIN" } as never)
    getOverviewMetricsMock.mockResolvedValue(defaultMetrics)

    const response = await GET(new Request("http://localhost/api/admin/overview"))
    const body = await response.json()

    expect(body.categoryBreakdown).toBeUndefined()
    expect(body.sourceDistribution).toBeUndefined()
    expect(body.topWastedItems).toBeUndefined()
    expect(body.dailyTrends).toBeUndefined()
    expect(getExtendedMetricsMock).not.toHaveBeenCalled()
  })

  // ── Detailed Mode Tests ─────────────────────────────────

  it("includes extended data when detailed=true", async () => {
    getCurrentUserIdMock.mockResolvedValue("admin1")
    findUniqueMock.mockResolvedValue({ role: "ADMIN" } as never)
    getOverviewMetricsMock.mockResolvedValue(defaultMetrics)
    getExtendedMetricsMock.mockResolvedValue(defaultExtended)

    const response = await GET(new Request("http://localhost/api/admin/overview?detailed=true"))
    expect(response.status).toBe(200)

    const body = await response.json()

    expect(body.summary).toBeDefined()
    expect(body.categoryBreakdown).toHaveLength(1)
    expect(body.categoryBreakdown[0].categoryName).toBe("Dairy")
    expect(body.sourceDistribution).toEqual({ receipt: 12, manual: 8 })
    expect(body.topWastedItems).toHaveLength(1)
    expect(body.dailyTrends).toHaveLength(1)
    expect(getExtendedMetricsMock).toHaveBeenCalledOnce()
  })

  it("does not include extended data when detailed=false", async () => {
    getCurrentUserIdMock.mockResolvedValue("admin1")
    findUniqueMock.mockResolvedValue({ role: "ADMIN" } as never)
    getOverviewMetricsMock.mockResolvedValue(defaultMetrics)

    const response = await GET(new Request("http://localhost/api/admin/overview?detailed=false"))
    const body = await response.json()

    expect(body.categoryBreakdown).toBeUndefined()
    expect(getExtendedMetricsMock).not.toHaveBeenCalled()
  })

  // ── Range Passthrough Tests ─────────────────────────────

  it("passes range query param to parseTimeRange", async () => {
    getCurrentUserIdMock.mockResolvedValue("admin1")
    findUniqueMock.mockResolvedValue({ role: "ADMIN" } as never)
    parseTimeRangeMock.mockReturnValue("30d")
    getOverviewMetricsMock.mockResolvedValue(defaultMetrics)

    const response = await GET(new Request("http://localhost/api/admin/overview?range=30d"))
    const body = await response.json()

    expect(parseTimeRangeMock).toHaveBeenCalledWith("30d")
    expect(body.range).toBe("30d")
    expect(getOverviewMetricsMock).toHaveBeenCalledWith("30d")
  })

  // ── Error Handling Tests ────────────────────────────────

  it("returns 500 when an unexpected error occurs", async () => {
    getCurrentUserIdMock.mockRejectedValue(new Error("Unexpected"))

    const consoleSpy = vi.spyOn(console, "error").mockImplementation(() => {})
    const response = await GET(new Request("http://localhost/api/admin/overview"))

    expect(response.status).toBe(500)
    const body = await response.json()
    expect(body.error).toBe("Failed to load admin overview data.")

    consoleSpy.mockRestore()
  })
})
