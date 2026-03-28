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

import { GET, POST } from "./route"
// @ts-expect-error - test-only mocked exports
import { findManyMock, findUniqueMock, createMock } from "@/lib/prisma"

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

  it("queries only ACTIVE items from Prisma", async () => {
    findManyMock.mockResolvedValue([])

    await GET()

    expect(findManyMock).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { status: "ACTIVE" },
      }),
    )
  })

  it("returns 500 when loading items fails", async () => {
    findManyMock.mockRejectedValue(new Error("db down"))

    const response = await GET()

    expect(response.status).toBe(500)
    const body = await response.json()
    expect(body.error).toMatch(/failed to load food items/i)
  })
})

describe("POST /api/items", () => {
  beforeEach(() => {
    findUniqueMock.mockReset()
    createMock.mockReset()
  })

  function makeRequest(body: unknown) {
    return new Request("http://localhost/api/items", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    })
  }

  it("creates a manual food item and returns 201", async () => {
    findUniqueMock.mockResolvedValue({ id: "cat-1", name: "Dairy" })
    createMock.mockResolvedValue({
      id: "item-1",
      name: "Milk",
      quantity: 2,
      categoryId: "cat-1",
    })

    const response = await POST(makeRequest({ name: "Milk", quantity: 2, categoryId: "cat-1" }))

    expect(response.status).toBe(201)
    const body = await response.json()
    expect(body).toMatchObject({ id: "item-1", name: "Milk", quantity: 2, categoryId: "cat-1" })
    expect(createMock).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({ name: "Milk", quantity: 2, categoryId: "cat-1", source: "MANUAL" }),
      }),
    )
  })

  it("returns 400 when name is missing", async () => {
    const response = await POST(makeRequest({ quantity: 1, categoryId: "cat-1" }))

    expect(response.status).toBe(400)
    const body = await response.json()
    expect(body.error).toMatch(/name is required/i)
  })

  it("returns 400 when quantity is not a positive integer", async () => {
    const response = await POST(makeRequest({ name: "Milk", quantity: 0, categoryId: "cat-1" }))

    expect(response.status).toBe(400)
    const body = await response.json()
    expect(body.error).toMatch(/quantity/i)
  })

  it("returns 400 when name is only whitespace", async () => {
    const response = await POST(makeRequest({ name: "   ", quantity: 1, categoryId: "cat-1" }))

    expect(response.status).toBe(400)
    const body = await response.json()
    expect(body.error).toMatch(/name is required/i)
  })

  it("returns 400 when quantity is a decimal", async () => {
    const response = await POST(makeRequest({ name: "Milk", quantity: 1.5, categoryId: "cat-1" }))

    expect(response.status).toBe(400)
    const body = await response.json()
    expect(body.error).toMatch(/whole number of at least 1/i)
  })

  it("returns 400 when categoryId is missing", async () => {
    const response = await POST(makeRequest({ name: "Milk", quantity: 1 }))

    expect(response.status).toBe(400)
    const body = await response.json()
    expect(body.error).toMatch(/category is required/i)
  })

  it("returns 422 when category does not exist", async () => {
    findUniqueMock.mockResolvedValue(null)

    const response = await POST(makeRequest({ name: "Milk", quantity: 1, categoryId: "bad-cat" }))

    expect(response.status).toBe(422)
    const body = await response.json()
    expect(body.error).toMatch(/category does not exist/i)
  })

  it("returns 500 when database create fails", async () => {
    findUniqueMock.mockResolvedValue({ id: "cat-1", name: "Dairy" })
    createMock.mockRejectedValue(new Error("db error"))

    const response = await POST(makeRequest({ name: "Milk", quantity: 1, categoryId: "cat-1" }))

    expect(response.status).toBe(500)
    const body = await response.json()
    expect(body.error).toMatch(/failed to save/i)
  })

  it("trims the item name before saving", async () => {
    findUniqueMock.mockResolvedValue({ id: "cat-1", name: "Dairy" })
    createMock.mockResolvedValue({
      id: "item-2",
      name: "Milk",
      quantity: 2,
      categoryId: "cat-1",
    })

    const response = await POST(makeRequest({ name: "  Milk  ", quantity: 2, categoryId: "cat-1" }))

    expect(response.status).toBe(201)
    await response.json()

    expect(createMock).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({ name: "Milk", quantity: 2, categoryId: "cat-1", source: "MANUAL" }),
      }),
    )
  })
})
