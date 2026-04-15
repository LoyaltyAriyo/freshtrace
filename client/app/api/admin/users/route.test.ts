import { NextResponse } from "next/server"
import { beforeEach, describe, expect, it, vi } from "vitest"

vi.mock("@/lib/auth/require-admin", () => ({
  requireAdmin: vi.fn(),
}))

vi.mock("@/lib/queries/admin-users", () => ({
  getAdminUserRecords: vi.fn(),
}))

import { GET } from "./route"
import { requireAdmin } from "@/lib/auth/require-admin"
import { getAdminUserRecords } from "@/lib/queries/admin-users"

const requireAdminMock = vi.mocked(requireAdmin)
const getAdminUserRecordsMock = vi.mocked(getAdminUserRecords)

const NOW = new Date("2025-01-01T00:00:00.000Z")

function makeUser(overrides: object = {}) {
  return {
    id: "u1",
    email: "a@example.com",
    fullName: "Ada",
    role: "USER" as const,
    accountStatus: "ACTIVE" as const,
    createdAt: NOW,
    ...overrides,
  }
}

describe("GET /api/admin/users", () => {
  beforeEach(() => {
    requireAdminMock.mockReset()
    getAdminUserRecordsMock.mockReset()
  })

  it("returns 401 when requireAdmin fails with unauthorized", async () => {
    requireAdminMock.mockResolvedValue({
      ok: false,
      response: NextResponse.json({ error: "Unauthorized." }, { status: 401 }),
    })

    const response = await GET(new Request("http://localhost/api/admin/users"))

    expect(response.status).toBe(401)
  })

  it("returns 403 when requireAdmin fails with forbidden", async () => {
    requireAdminMock.mockResolvedValue({
      ok: false,
      response: NextResponse.json({ error: "Forbidden." }, { status: 403 }),
    })

    const response = await GET(new Request("http://localhost/api/admin/users"))

    expect(response.status).toBe(403)
  })

  it("returns users with activity labels and pagination when authorized", async () => {
    requireAdminMock.mockResolvedValue({ ok: true })
    getAdminUserRecordsMock.mockResolvedValue({
      users: [
        makeUser({ id: "u1", email: "a@example.com", fullName: "Ada", accountStatus: "ACTIVE" }),
        makeUser({ id: "u2", email: "b@example.com", fullName: "Bob", accountStatus: "DISABLED" }),
      ],
      total: 2,
    })

    const response = await GET(new Request("http://localhost/api/admin/users"))

    expect(response.status).toBe(200)
    const body = await response.json()

    expect(body.users).toHaveLength(2)
    expect(body.users[0]).toMatchObject({
      email: "a@example.com",
      fullName: "Ada",
      role: "USER",
      accountStatus: "ACTIVE",
      activityStatus: "Active",
      joinedAt: NOW.toISOString(),
    })
    expect(body.users[1]).toMatchObject({
      activityStatus: "Disabled",
    })
    expect(body.pagination).toMatchObject({
      total: 2,
      page: 1,
      limit: 20,
      totalPages: 1,
    })
    expect(getAdminUserRecordsMock).toHaveBeenCalledWith({
      where: {},
      limit: 20,
      offset: 0,
    })
  })

  it("applies search q on fullName and email (case-insensitive)", async () => {
    requireAdminMock.mockResolvedValue({ ok: true })
    getAdminUserRecordsMock.mockResolvedValue({ users: [], total: 0 })

    await GET(new Request("http://localhost/api/admin/users?q=ada"))

    expect(getAdminUserRecordsMock).toHaveBeenCalledWith({
      where: {
        OR: [
          { fullName: { contains: "ada", mode: "insensitive" } },
          { email: { contains: "ada", mode: "insensitive" } },
        ],
      },
      limit: 20,
      offset: 0,
    })
  })

  it("applies status filter when status is ACTIVE or DISABLED", async () => {
    requireAdminMock.mockResolvedValue({ ok: true })
    getAdminUserRecordsMock.mockResolvedValue({ users: [], total: 0 })

    await GET(new Request("http://localhost/api/admin/users?status=ACTIVE"))

    expect(getAdminUserRecordsMock).toHaveBeenCalledWith({
      where: { accountStatus: "ACTIVE" },
      limit: 20,
      offset: 0,
    })
  })

  it("combines q and status filters", async () => {
    requireAdminMock.mockResolvedValue({ ok: true })
    getAdminUserRecordsMock.mockResolvedValue({ users: [], total: 0 })

    await GET(new Request("http://localhost/api/admin/users?q=test&status=DISABLED"))

    expect(getAdminUserRecordsMock).toHaveBeenCalledWith({
      where: {
        accountStatus: "DISABLED",
        OR: [
          { fullName: { contains: "test", mode: "insensitive" } },
          { email: { contains: "test", mode: "insensitive" } },
        ],
      },
      limit: 20,
      offset: 0,
    })
  })

  it("paginates using page and limit params", async () => {
    requireAdminMock.mockResolvedValue({ ok: true })
    getAdminUserRecordsMock.mockResolvedValue({ users: [], total: 50 })

    const response = await GET(new Request("http://localhost/api/admin/users?page=3&limit=10"))

    expect(response.status).toBe(200)
    const body = await response.json()
    expect(body.pagination).toMatchObject({ page: 3, limit: 10, total: 50, totalPages: 5 })
    expect(getAdminUserRecordsMock).toHaveBeenCalledWith({
      where: {},
      limit: 10,
      offset: 20,
    })
  })

  it("returns 400 for invalid status query", async () => {
    requireAdminMock.mockResolvedValue({ ok: true })

    const response = await GET(new Request("http://localhost/api/admin/users?status=maybe"))

    expect(response.status).toBe(400)
    expect(getAdminUserRecordsMock).not.toHaveBeenCalled()
  })

  it("returns 400 for invalid page param", async () => {
    requireAdminMock.mockResolvedValue({ ok: true })

    const response = await GET(new Request("http://localhost/api/admin/users?page=0"))

    expect(response.status).toBe(400)
    expect(getAdminUserRecordsMock).not.toHaveBeenCalled()
  })

  it("returns 400 for limit exceeding maximum", async () => {
    requireAdminMock.mockResolvedValue({ ok: true })

    const response = await GET(new Request("http://localhost/api/admin/users?limit=999"))

    expect(response.status).toBe(400)
    expect(getAdminUserRecordsMock).not.toHaveBeenCalled()
  })

  it("returns 500 when findMany throws", async () => {
    requireAdminMock.mockResolvedValue({ ok: true })
    getAdminUserRecordsMock.mockRejectedValue(new Error("db"))

    const response = await GET(new Request("http://localhost/api/admin/users"))

    expect(response.status).toBe(500)
    const body = await response.json()
    expect(body.error).toMatch(/failed to load users/i)
  })
})
