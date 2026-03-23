import { beforeEach, describe, expect, it, vi } from "vitest"

vi.mock("@/lib/prisma", () => {
  const findManyMock = vi.fn()

  return {
    prisma: {
      foodItem: {
        findMany: findManyMock,
      },
    },
    findManyMock,
  }
})

import { GET } from "./route"
// @ts-expect-error - test-only mocked exports
import { findManyMock } from "@/lib/prisma"

describe("GET /api/items/prioritized", () => {
  beforeEach(() => {
    findManyMock.mockReset()
  })

  it("returns grouped prioritized items", async () => {
    findManyMock.mockResolvedValue([
      {
        id: "item-1",
        name: "Milk",
        quantity: 2,
        dateAdded: new Date("2026-03-10T00:00:00.000Z"),
        category: { name: "Dairy" },
      },
      {
        id: "item-2",
        name: "Apple",
        quantity: 3,
        dateAdded: new Date("2026-03-21T00:00:00.000Z"),
        category: { name: "Produce" },
      },
    ])

    const response = await GET()

    expect(response.status).toBe(200)
    const body = await response.json()

    expect(Array.isArray(body.items)).toBe(true)
    expect(Array.isArray(body.useFirst)).toBe(true)
    expect(Array.isArray(body.useSoon)).toBe(true)
    expect(Array.isArray(body.useLater)).toBe(true)

    expect(body.items).toHaveLength(2)
    expect(body.items[0]).toMatchObject({
      id: "item-1",
      name: "Milk",
      category: "dairy",
      quantity: "2",
      status: "active",
    })
  })

  it("returns 500 when query fails", async () => {
    findManyMock.mockRejectedValue(new Error("db down"))

    const response = await GET()

    expect(response.status).toBe(500)
    const body = await response.json()
    expect(body.error).toMatch(/failed to load prioritized items/i)
  })
})
