import { NextResponse } from "next/server"
import { beforeEach, describe, expect, it, vi } from "vitest"

vi.mock("@/lib/auth/require-admin", () => ({
  requireAdmin: vi.fn(),
}))

vi.mock("@/lib/prisma", () => ({
  prisma: {
    user: {
      findMany: vi.fn(),
    },
  },
}))

import { GET } from "./route"
import { requireAdmin } from "@/lib/auth/require-admin"
import { prisma } from "@/lib/prisma"

const requireAdminMock = vi.mocked(requireAdmin)
const findManyUserMock = vi.mocked(prisma.user.findMany)

describe("GET /api/admin/users", () => {
  beforeEach(() => {
    requireAdminMock.mockReset()
    findManyUserMock.mockReset()
  })

  it("returns 401 when requireAdmin fails with unauthorized", async () => {
    requireAdminMock.mockResolvedValue({
      ok: false,
      response: NextResponse.json({ error: "Unauthorized." }, { status: 401 }),
    })

    const response = await GET()

    expect(response.status).toBe(401)
  })

  it("returns 403 when requireAdmin fails with forbidden", async () => {
    requireAdminMock.mockResolvedValue({
      ok: false,
      response: NextResponse.json({ error: "Forbidden." }, { status: 403 }),
    })

    const response = await GET()

    expect(response.status).toBe(403)
  })

  it("returns users with activity labels when authorized", async () => {
    requireAdminMock.mockResolvedValue({ ok: true })
    findManyUserMock.mockResolvedValue([
      {
        id: "u1",
        email: "a@example.com",
        fullName: "Ada",
        accountStatus: "ACTIVE",
      },
      {
        id: "u2",
        email: "b@example.com",
        fullName: "Bob",
        accountStatus: "DISABLED",
      },
    ])

    const response = await GET()

    expect(response.status).toBe(200)
    const body = await response.json()

    expect(body.users).toHaveLength(2)
    expect(body.users[0]).toMatchObject({
      email: "a@example.com",
      fullName: "Ada",
      accountStatus: "ACTIVE",
      activityStatus: "Active",
    })
    expect(body.users[1]).toMatchObject({
      activityStatus: "Disabled",
    })
    expect(findManyUserMock).toHaveBeenCalledWith(
      expect.objectContaining({
        orderBy: { createdAt: "desc" },
        select: expect.objectContaining({
          email: true,
          fullName: true,
          accountStatus: true,
        }),
      }),
    )
  })

  it("returns 500 when findMany throws", async () => {
    requireAdminMock.mockResolvedValue({ ok: true })
    findManyUserMock.mockRejectedValue(new Error("db"))

    const response = await GET()

    expect(response.status).toBe(500)
    const body = await response.json()
    expect(body.error).toMatch(/failed to load users/i)
  })
})
