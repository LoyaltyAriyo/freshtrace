import { NextResponse } from "next/server"
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest"

vi.mock("@/lib/auth/require-admin", () => ({
  requireAdmin: vi.fn(),
}))

vi.mock("@/lib/queries/admin-analytics", () => ({
  getAdminAnalyticsReport: vi.fn(),
}))

import { GET } from "./route"
import { requireAdmin } from "@/lib/auth/require-admin"
import { getAdminAnalyticsReport } from "@/lib/queries/admin-analytics"

const requireAdminMock = vi.mocked(requireAdmin)
const getAdminAnalyticsReportMock = vi.mocked(getAdminAnalyticsReport)

const sampleReport = {
  range: "7d" as const,
  summary: {
    totalItems: 100,
    activeItems: 40,
    usedItems: 30,
    wastedItems: 10,
    receiptCount: 5,
    wasteRate: 25,
  },
  breakdown: {
    itemsByCategory: [
      { categoryId: "c1", categoryName: "Produce", activeCount: 20 },
    ],
    wasteByCategory: [
      { categoryId: "c1", categoryName: "Produce", wastedCount: 4, wastedQuantity: 6 },
    ],
  },
  recentWaste: [
    {
      id: "w1",
      name: "Lettuce",
      quantity: 1,
      categoryName: "Produce",
      markedWastedAt: "2026-04-10T10:00:00.000Z",
    },
  ],
}

describe("GET /api/admin/analytics", () => {
  beforeEach(() => {
    requireAdminMock.mockReset()
    getAdminAnalyticsReportMock.mockReset()
  })

  afterEach(() => {
    vi.useRealTimers()
  })

  it("returns 401 when requireAdmin fails", async () => {
    requireAdminMock.mockResolvedValue({
      ok: false,
      response: NextResponse.json({ error: "Unauthorized." }, { status: 401 }),
    })

    const response = await GET(new Request("http://localhost/api/admin/analytics"))

    expect(response.status).toBe(401)
    expect(getAdminAnalyticsReportMock).not.toHaveBeenCalled()
  })

  it("returns 403 when requireAdmin denies access", async () => {
    requireAdminMock.mockResolvedValue({
      ok: false,
      response: NextResponse.json({ error: "Forbidden." }, { status: 403 }),
    })

    const response = await GET(new Request("http://localhost/api/admin/analytics"))

    expect(response.status).toBe(403)
    expect(getAdminAnalyticsReportMock).not.toHaveBeenCalled()
  })

  it("returns full report with summary, breakdown, recentWaste, and generatedAt", async () => {
    vi.useFakeTimers()
    vi.setSystemTime(new Date("2026-04-13T12:00:00.000Z"))

    requireAdminMock.mockResolvedValue({ ok: true })
    getAdminAnalyticsReportMock.mockResolvedValue(sampleReport)

    const response = await GET(new Request("http://localhost/api/admin/analytics"))

    expect(response.status).toBe(200)
    const body = await response.json()

    expect(body.range).toBe("7d")
    expect(body.generatedAt).toBe("2026-04-13T12:00:00.000Z")
    expect(body.summary).toEqual(sampleReport.summary)
    expect(body.breakdown).toEqual(sampleReport.breakdown)
    expect(body.recentWaste).toHaveLength(1)
    expect(body.recentWaste[0].name).toBe("Lettuce")
    expect(getAdminAnalyticsReportMock).toHaveBeenCalledWith("7d")
  })

  it("passes parsed range from query string for filters", async () => {
    requireAdminMock.mockResolvedValue({ ok: true })
    getAdminAnalyticsReportMock.mockResolvedValue({
      ...sampleReport,
      range: "30d",
    })

    await GET(new Request("http://localhost/api/admin/analytics?range=30d"))

    expect(getAdminAnalyticsReportMock).toHaveBeenCalledWith("30d")
  })

  it("passes today range from query string", async () => {
    requireAdminMock.mockResolvedValue({ ok: true })
    getAdminAnalyticsReportMock.mockResolvedValue({
      ...sampleReport,
      range: "today",
    })

    await GET(new Request("http://localhost/api/admin/analytics?range=today"))

    expect(getAdminAnalyticsReportMock).toHaveBeenCalledWith("today")
  })

  it("defaults invalid range to 7d for query parsing", async () => {
    requireAdminMock.mockResolvedValue({ ok: true })
    getAdminAnalyticsReportMock.mockResolvedValue(sampleReport)

    await GET(new Request("http://localhost/api/admin/analytics?range=invalid"))

    expect(getAdminAnalyticsReportMock).toHaveBeenCalledWith("7d")
  })

  it("returns 500 when getAdminAnalyticsReport throws", async () => {
    requireAdminMock.mockResolvedValue({ ok: true })
    getAdminAnalyticsReportMock.mockRejectedValue(new Error("db"))

    const response = await GET(new Request("http://localhost/api/admin/analytics"))
    const body = await response.json()

    expect(response.status).toBe(500)
    expect(body.error).toMatch(/failed to load analytics data/i)
  })
})
