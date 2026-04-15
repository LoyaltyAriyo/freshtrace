import { beforeEach, describe, expect, it, vi } from "vitest"

const prismaMocks = vi.hoisted(() => {
  return {
    userFindMany: vi.fn(),
    userCount: vi.fn(),
  }
})

vi.mock("@/lib/prisma", () => ({
  prisma: {
    user: {
      findMany: prismaMocks.userFindMany,
      count: prismaMocks.userCount,
    },
  },
}))

import { getAdminUserRecords } from "./admin-users"

const { userFindMany, userCount } = prismaMocks

describe("getAdminUserRecords", () => {
  beforeEach(() => {
    userFindMany.mockReset()
    userCount.mockReset()
  })

  it("returns selected user records ordered by newest first with total count", async () => {
    const createdAt = new Date("2026-04-15T12:00:00.000Z")

    userFindMany.mockResolvedValue([
      {
        id: "u1",
        email: "ada@example.com",
        fullName: "Ada Lovelace",
        role: "ADMIN",
        accountStatus: "ACTIVE",
        createdAt,
      },
    ])
    userCount.mockResolvedValue(1)

    const result = await getAdminUserRecords()

    expect(result).toEqual({
      users: [
        {
          id: "u1",
          email: "ada@example.com",
          fullName: "Ada Lovelace",
          role: "ADMIN",
          accountStatus: "ACTIVE",
          createdAt,
        },
      ],
      total: 1,
    })

    expect(userFindMany).toHaveBeenCalledWith({
      where: {},
      orderBy: { createdAt: "desc" },
      take: 20,
      skip: 0,
      select: {
        id: true,
        email: true,
        fullName: true,
        role: true,
        accountStatus: true,
        createdAt: true,
      },
    })
    expect(userCount).toHaveBeenCalledWith({ where: {} })
  })

  it("passes through where, limit, and offset filters", async () => {
    const where = {
      accountStatus: "ACTIVE" as const,
      OR: [
        { fullName: { contains: "ada", mode: "insensitive" as const } },
        { email: { contains: "ada", mode: "insensitive" as const } },
      ],
    }

    userFindMany.mockResolvedValue([])
    userCount.mockResolvedValue(0)

    await getAdminUserRecords({
      where,
      limit: 10,
      offset: 20,
    })

    expect(userFindMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where,
        take: 10,
        skip: 20,
      }),
    )
    expect(userCount).toHaveBeenCalledWith({ where })
  })
})
