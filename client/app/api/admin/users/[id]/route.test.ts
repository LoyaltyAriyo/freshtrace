import { NextResponse } from "next/server"
import { beforeEach, describe, expect, it, vi } from "vitest"

vi.mock("@/lib/auth/require-admin", () => ({
  requireAdmin: vi.fn(),
}))

vi.mock("@/lib/prisma", () => ({
  prisma: {
    user: {
      findUnique: vi.fn(),
    },
  },
}))

import { GET } from "./route"
import { requireAdmin } from "@/lib/auth/require-admin"
import { prisma } from "@/lib/prisma"

const requireAdminMock = vi.mocked(requireAdmin)
const findUniqueMock = vi.mocked(prisma.user.findUnique)

describe("GET /api/admin/users/[id]", () => {
  beforeEach(() => {
    requireAdminMock.mockReset()
    findUniqueMock.mockReset()
  })

  it("returns 401 when requireAdmin fails with unauthorized", async () => {
    requireAdminMock.mockResolvedValue({
      ok: false,
      response: NextResponse.json({ error: "Unauthorized." }, { status: 401 }),
    })

    const response = await GET(new Request("http://localhost/api/admin/users/u1"), {
      params: Promise.resolve({ id: "u1" }),
    })

    expect(response.status).toBe(401)
    expect(findUniqueMock).not.toHaveBeenCalled()
  })

  it("returns 404 when user is not found", async () => {
    requireAdminMock.mockResolvedValue({ ok: true })
    findUniqueMock.mockResolvedValue(null)

    const response = await GET(new Request("http://localhost/api/admin/users/u1"), {
      params: Promise.resolve({ id: "u1" }),
    })

    expect(response.status).toBe(404)
  })

  it("returns user details with activityStatus when found", async () => {
    requireAdminMock.mockResolvedValue({ ok: true })
    findUniqueMock.mockResolvedValue({
      id: "u1",
      email: "a@example.com",
      fullName: "Ada",
      role: "USER" as const,
      accountStatus: "ACTIVE" as const,
      createdAt: new Date("2025-01-01T00:00:00.000Z"),
      updatedAt: new Date("2025-01-01T00:00:00.000Z"),
    })

    const response = await GET(new Request("http://localhost/api/admin/users/u1"), {
      params: Promise.resolve({ id: "u1" }),
    })

    expect(response.status).toBe(200)
    const body = await response.json()
    expect(body.user).toMatchObject({
      id: "u1",
      email: "a@example.com",
      fullName: "Ada",
      accountStatus: "ACTIVE",
      activityStatus: "Active",
    })
  })

  it("returns 500 when findUnique throws", async () => {
    requireAdminMock.mockResolvedValue({ ok: true })
    findUniqueMock.mockRejectedValue(new Error("db"))

    const response = await GET(new Request("http://localhost/api/admin/users/u1"), {
      params: Promise.resolve({ id: "u1" }),
    })

    expect(response.status).toBe(500)
    const body = await response.json()
    expect(body.error).toMatch(/failed to load user/i)
  })
})

