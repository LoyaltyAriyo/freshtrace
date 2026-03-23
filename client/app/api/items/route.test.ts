import { beforeEach, describe, expect, it, vi } from "vitest"

vi.mock("@/lib/prisma", () => {
  const findManyMock = vi.fn()
  const findUniqueMock = vi.fn()
  const createMock = vi.fn()

  return {
    prisma: {
      foodItem: {
        findMany: findManyMock,
        create: createMock,
      },
      category: {
        findUnique: findUniqueMock,
      },
    },
    findManyMock,
    findUniqueMock,
    createMock,
  }
})

import { GET } from "./route"
// @ts-expect-error - test-only mocked exports
import { findManyMock } from "@/lib/prisma"

describe("GET /api/items", () => {
  beforeEach(() => {
    findManyMock.mockReset()
  })

  it("returns active items with category and priority", async () => {
    findManyMock.mockResolvedValue([
      {
        id: "item-1",
        name: "Milk",
        quantity: 2,
        dateAdded: new Date("2026-03-20T00:00:00.000Z"),
        status: "ACTIVE",
        category: { name: "Dairy" },
      },
    ])

    const response = await GET()

    expect(response.status).toBe(200)
    const body = await response.json()

    expect(body).toHaveLength(1)
    expect(body[0]).toMatchObject({
      id: "item-1",
      name: "Milk",
      quantity: 2,
      categoryName: "Dairy",
      status: "ACTIVE",
    })
  })

  it("returns 500 when loading items fails", async () => {
    findManyMock.mockRejectedValue(new Error("db down"))

    const response = await GET()

    expect(response.status).toBe(500)
    const body = await response.json()
    expect(body.error).toMatch(/failed to load food items/i)
  })
})
