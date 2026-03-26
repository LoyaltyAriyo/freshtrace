import { beforeEach, describe, expect, it, vi } from "vitest"

vi.mock("@/lib/prisma", () => {
  const findFoodItemMock = vi.fn()
  const findCategoryMock = vi.fn()
  const updateMock = vi.fn()

  return {
    prisma: {
      foodItem: {
        findUnique: findFoodItemMock,
        update: updateMock,
      },
      category: {
        findUnique: findCategoryMock,
      },
    },
    findFoodItemMock,
    findCategoryMock,
    updateMock,
  }
})

import { GET, PATCH } from "./route"
// @ts-expect-error - test-only mocked exports
import { findCategoryMock, findFoodItemMock, updateMock } from "@/lib/prisma"

function makeParams(id: string) {
  return { params: Promise.resolve({ id }) }
}

function makePatchRequest(body: unknown) {
  return new Request("http://localhost/api/items/item-1", {
    method: "PATCH",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  })
}

describe("GET /api/items/[id]", () => {
  beforeEach(() => {
    findFoodItemMock.mockReset()
  })

  it("returns item with category when found", async () => {
    findFoodItemMock.mockResolvedValue({
      id: "item-1",
      name: "Milk",
      quantity: 2,
      category: { id: "cat-1", name: "Dairy" },
    })

    const response = await GET(new Request("http://localhost/api/items/item-1"), makeParams("item-1"))

    expect(response.status).toBe(200)
    const body = await response.json()
    expect(body).toMatchObject({
      id: "item-1",
      name: "Milk",
      quantity: 2,
    })
  })

  it("returns 404 when item is missing", async () => {
    findFoodItemMock.mockResolvedValue(null)

    const response = await GET(new Request("http://localhost/api/items/item-1"), makeParams("item-1"))

    expect(response.status).toBe(404)
    const body = await response.json()
    expect(body.error).toMatch(/item not found/i)
  })
})

describe("PATCH /api/items/[id]", () => {
  beforeEach(() => {
    findFoodItemMock.mockReset()
    findCategoryMock.mockReset()
    updateMock.mockReset()
  })

  it("updates the item and returns the updated record", async () => {
    findFoodItemMock.mockResolvedValue({ id: "item-1" })
    findCategoryMock.mockResolvedValue({ id: "cat-1" })
    updateMock.mockResolvedValue({
      id: "item-1",
      name: "Milk",
      quantity: 2,
      categoryId: "cat-1",
      category: { id: "cat-1", name: "Dairy" },
    })

    const response = await PATCH(
      makePatchRequest({ name: "  Milk  ", quantity: 2, categoryId: "cat-1" }),
      makeParams("item-1")
    )

    expect(response.status).toBe(200)
    expect(updateMock).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { id: "item-1" },
        data: {
          name: "Milk",
          quantity: 2,
          categoryId: "cat-1",
        },
      })
    )
  })

  it("returns 400 when JSON body is invalid", async () => {
    const response = await PATCH(
      new Request("http://localhost/api/items/item-1", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: "{bad json",
      }),
      makeParams("item-1")
    )

    expect(response.status).toBe(400)
    const body = await response.json()
    expect(body.error).toMatch(/invalid json/i)
  })

  it("returns 400 when name is missing", async () => {
    const response = await PATCH(
      makePatchRequest({ quantity: 2, categoryId: "cat-1" }),
      makeParams("item-1")
    )

    expect(response.status).toBe(400)
    const body = await response.json()
    expect(body.error).toMatch(/name is required/i)
  })

  it("returns 400 when quantity is invalid", async () => {
    const response = await PATCH(
      makePatchRequest({ name: "Milk", quantity: 0, categoryId: "cat-1" }),
      makeParams("item-1")
    )

    expect(response.status).toBe(400)
    const body = await response.json()
    expect(body.error).toMatch(/quantity/i)
  })

  it("returns 400 when category is missing", async () => {
    const response = await PATCH(
      makePatchRequest({ name: "Milk", quantity: 1 }),
      makeParams("item-1")
    )

    expect(response.status).toBe(400)
    const body = await response.json()
    expect(body.error).toMatch(/category is required/i)
  })

  it("returns 404 when item does not exist", async () => {
    findFoodItemMock.mockResolvedValue(null)

    const response = await PATCH(
      makePatchRequest({ name: "Milk", quantity: 1, categoryId: "cat-1" }),
      makeParams("item-1")
    )

    expect(response.status).toBe(404)
    const body = await response.json()
    expect(body.error).toMatch(/item not found/i)
  })

  it("returns 422 when category does not exist", async () => {
    findFoodItemMock.mockResolvedValue({ id: "item-1" })
    findCategoryMock.mockResolvedValue(null)

    const response = await PATCH(
      makePatchRequest({ name: "Milk", quantity: 1, categoryId: "bad-cat" }),
      makeParams("item-1")
    )

    expect(response.status).toBe(422)
    const body = await response.json()
    expect(body.error).toMatch(/category does not exist/i)
  })

  it("returns 500 when update fails unexpectedly", async () => {
    findFoodItemMock.mockResolvedValue({ id: "item-1" })
    findCategoryMock.mockResolvedValue({ id: "cat-1" })
    updateMock.mockRejectedValue(new Error("db error"))

    const response = await PATCH(
      makePatchRequest({ name: "Milk", quantity: 1, categoryId: "cat-1" }),
      makeParams("item-1")
    )

    expect(response.status).toBe(500)
    const body = await response.json()
    expect(body.error).toMatch(/failed to update item/i)
  })
})
