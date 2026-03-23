import { beforeEach, describe, expect, it, vi } from "vitest"

vi.mock("@/lib/prisma", () => {
  const findManyMock = vi.fn()

  return {
    prisma: {
      category: {
        findMany: findManyMock,
      },
    },
    findManyMock,
  }
})

import { GET } from "./route"
// @ts-expect-error - test-only mocked exports
import { findManyMock } from "@/lib/prisma"

describe("GET /api/categories", () => {
  beforeEach(() => {
    findManyMock.mockReset()
  })

  it("returns categories sorted by name", async () => {
    findManyMock.mockResolvedValue([
      { id: "cat-1", name: "Bakery", shelfLifeDays: 5 },
      { id: "cat-2", name: "Dairy", shelfLifeDays: 10 },
    ])

    const response = await GET()

    expect(response.status).toBe(200)
    const body = await response.json()
    expect(body).toEqual([
      { id: "cat-1", name: "Bakery", shelfLifeDays: 5 },
      { id: "cat-2", name: "Dairy", shelfLifeDays: 10 },
    ])
    expect(findManyMock).toHaveBeenCalledWith({
      select: {
        id: true,
        name: true,
        shelfLifeDays: true,
      },
      orderBy: { name: "asc" },
    })
  })

  it("returns 500 when category query fails", async () => {
    findManyMock.mockRejectedValue(new Error("db down"))

    const response = await GET()

    expect(response.status).toBe(500)
    const body = await response.json()
    expect(body.error).toMatch(/failed to load categories/i)
  })
})
