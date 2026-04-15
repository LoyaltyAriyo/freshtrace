import { NextResponse } from "next/server"
import { beforeEach, describe, expect, it, vi } from "vitest"

vi.mock("@/lib/auth/require-admin", () => ({
  requireAdmin: vi.fn(),
}))

vi.mock("@/lib/queries/error-logs", () => ({
  getErrorLogs: vi.fn(),
}))

import { GET } from "./route"
import { requireAdmin } from "@/lib/auth/require-admin"
import { getErrorLogs } from "@/lib/queries/error-logs"

const requireAdminMock = vi.mocked(requireAdmin)
const getErrorLogsMock = vi.mocked(getErrorLogs)

const sampleResult = {
  logs: [
    {
      id: "log1",
      message: "Database connection failed",
      errorType: "ConnectionError",
      severity: "ERROR" as const,
      source: "DB" as const,
      details: { host: "localhost" },
      stackTrace: null,
      createdAt: "2026-04-14T10:00:00.000Z",
    },
  ],
  total: 1,
}

describe("GET /api/admin/errors", () => {
  beforeEach(() => {
    requireAdminMock.mockReset()
    getErrorLogsMock.mockReset()
  })

  it("returns 401 when requireAdmin fails", async () => {
    requireAdminMock.mockResolvedValue({
      ok: false,
      response: NextResponse.json({ error: "Unauthorized." }, { status: 401 }),
    })

    const response = await GET(new Request("http://localhost/api/admin/errors"))

    expect(response.status).toBe(401)
    expect(getErrorLogsMock).not.toHaveBeenCalled()
  })

  it("returns 403 when requireAdmin denies access", async () => {
    requireAdminMock.mockResolvedValue({
      ok: false,
      response: NextResponse.json({ error: "Forbidden." }, { status: 403 }),
    })

    const response = await GET(new Request("http://localhost/api/admin/errors"))

    expect(response.status).toBe(403)
    expect(getErrorLogsMock).not.toHaveBeenCalled()
  })

  it("returns logs and total with default pagination", async () => {
    requireAdminMock.mockResolvedValue({ ok: true })
    getErrorLogsMock.mockResolvedValue(sampleResult)

    const response = await GET(new Request("http://localhost/api/admin/errors"))

    expect(response.status).toBe(200)
    const body = await response.json()
    expect(body.logs).toHaveLength(1)
    expect(body.total).toBe(1)
    expect(getErrorLogsMock).toHaveBeenCalledWith({
      severity: undefined,
      source: undefined,
      limit: 50,
      offset: 0,
    })
  })

  it("filters by severity", async () => {
    requireAdminMock.mockResolvedValue({ ok: true })
    getErrorLogsMock.mockResolvedValue(sampleResult)

    await GET(new Request("http://localhost/api/admin/errors?severity=ERROR"))

    expect(getErrorLogsMock).toHaveBeenCalledWith(
      expect.objectContaining({ severity: "ERROR" }),
    )
  })

  it("filters by source", async () => {
    requireAdminMock.mockResolvedValue({ ok: true })
    getErrorLogsMock.mockResolvedValue(sampleResult)

    await GET(new Request("http://localhost/api/admin/errors?source=DB"))

    expect(getErrorLogsMock).toHaveBeenCalledWith(
      expect.objectContaining({ source: "DB" }),
    )
  })

  it("accepts lowercase severity and source params", async () => {
    requireAdminMock.mockResolvedValue({ ok: true })
    getErrorLogsMock.mockResolvedValue(sampleResult)

    await GET(new Request("http://localhost/api/admin/errors?severity=critical&source=auth"))

    expect(getErrorLogsMock).toHaveBeenCalledWith(
      expect.objectContaining({ severity: "CRITICAL", source: "AUTH" }),
    )
  })

  it("ignores invalid severity and source", async () => {
    requireAdminMock.mockResolvedValue({ ok: true })
    getErrorLogsMock.mockResolvedValue(sampleResult)

    await GET(new Request("http://localhost/api/admin/errors?severity=INVALID&source=UNKNOWN"))

    expect(getErrorLogsMock).toHaveBeenCalledWith(
      expect.objectContaining({ severity: undefined, source: undefined }),
    )
  })

  it("passes limit and offset", async () => {
    requireAdminMock.mockResolvedValue({ ok: true })
    getErrorLogsMock.mockResolvedValue({ logs: [], total: 0 })

    await GET(new Request("http://localhost/api/admin/errors?limit=10&offset=20"))

    expect(getErrorLogsMock).toHaveBeenCalledWith(
      expect.objectContaining({ limit: 10, offset: 20 }),
    )
  })

  it("caps limit at 100", async () => {
    requireAdminMock.mockResolvedValue({ ok: true })
    getErrorLogsMock.mockResolvedValue({ logs: [], total: 0 })

    await GET(new Request("http://localhost/api/admin/errors?limit=500"))

    expect(getErrorLogsMock).toHaveBeenCalledWith(
      expect.objectContaining({ limit: 100 }),
    )
  })

  it("returns 500 when getErrorLogs throws", async () => {
    requireAdminMock.mockResolvedValue({ ok: true })
    getErrorLogsMock.mockRejectedValue(new Error("db error"))

    const response = await GET(new Request("http://localhost/api/admin/errors"))
    const body = await response.json()

    expect(response.status).toBe(500)
    expect(body.error).toMatch(/failed to load error logs/i)
  })
})
