import { afterEach, beforeEach, describe, expect, it, vi } from "vitest"

const prismaMocks = vi.hoisted(() => ({
  findManyMock: vi.fn(),
}))

vi.mock("@/lib/prisma", () => {
  return {
    prisma: {
      foodItem: {
        findMany: prismaMocks.findManyMock,
      },
    },
  }
})

vi.mock("@/lib/auth", () => {
  return {
    getCurrentUserId: vi.fn().mockResolvedValue("user-123"),
  }
})

import { GET } from "./route"
const { findManyMock } = prismaMocks

describe("GET /api/items/prioritized", () => {
  beforeEach(() => {
    findManyMock.mockReset()
  })

  afterEach(() => {
    vi.useRealTimers()
  })

  it("returns grouped prioritized items", async () => {
    findManyMock.mockResolvedValue([
      {
        id: "item-1",
        name: "Milk",
        quantity: 2,
        dateAdded: new Date("2026-03-10T00:00:00.000Z"),
        category: { name: "Dairy", shelfLifeDays: 7 },
      },
      {
        id: "item-2",
        name: "Apple",
        quantity: 3,
        dateAdded: new Date("2026-03-21T00:00:00.000Z"),
        category: { name: "Produce", shelfLifeDays: 7 },
      },
    ])

    const response = await GET(new Request("http://localhost/api/items/prioritized"))

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

  it("classifies items into the correct priority buckets", async () => {
    vi.useFakeTimers()
    vi.setSystemTime(new Date("2026-03-21T12:00:00.000Z"))

    findManyMock.mockResolvedValue([
      {
        id: "fresh-item",
        name: "Butter",
        quantity: 1,
        // 1 day old -> use-later
        dateAdded: new Date("2026-03-20T12:00:00.000Z"),
        category: { name: "Dairy", shelfLifeDays: 7 },
      },
      {
        id: "soon-item",
        name: "Apples",
        quantity: 3,
        // 3 days old -> use-soon
        dateAdded: new Date("2026-03-18T12:00:00.000Z"),
        category: { name: "Produce", shelfLifeDays: 7 },
      },
      {
        id: "first-item",
        name: "Leftover Pasta",
        quantity: 2,
        // 5 days old -> use-first
        dateAdded: new Date("2026-03-16T12:00:00.000Z"),
        category: { name: "Leftover", shelfLifeDays: 7 },
      },
    ])

    const response = await GET(new Request("http://localhost/api/items/prioritized"))

    expect(response.status).toBe(200)
    const body = await response.json()

    expect(body.items).toHaveLength(3)
    expect(body.useLater.map((item: { id: string }) => item.id)).toEqual([
      "fresh-item",
    ])
    expect(body.useSoon.map((item: { id: string }) => item.id)).toEqual([
      "soon-item",
    ])
    expect(body.useFirst.map((item: { id: string }) => item.id)).toEqual([
      "first-item",
    ])
  })

  it("queries only ACTIVE items from Prisma", async () => {
    findManyMock.mockResolvedValue([])

    await GET(new Request("http://localhost/api/items/prioritized"))

    expect(findManyMock).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { status: "ACTIVE", userId: "user-123" },
      }),
    )
  })

  it("returns 500 when query fails", async () => {
    findManyMock.mockRejectedValue(new Error("db down"))

    const response = await GET(new Request("http://localhost/api/items/prioritized"))

    expect(response.status).toBe(500)
    const body = await response.json()
    expect(body.error).toMatch(/failed to load prioritized items/i)
  })
})
