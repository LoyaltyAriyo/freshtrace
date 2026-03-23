import { beforeEach, describe, expect, it, vi } from "vitest"

vi.mock("@/lib/prisma", () => {
  const findUniqueMock = vi.fn()
  const updateMock = vi.fn()
  const upsertUsedItemMock = vi.fn()
  const transactionMock = vi.fn()

  return {
    prisma: {
      foodItem: {
        findUnique: findUniqueMock,
        update: updateMock,
      },
      usedItem: {
        upsert: upsertUsedItemMock,
      },
      $transaction: transactionMock,
    },
    findUniqueMock,
    updateMock,
    upsertUsedItemMock,
    transactionMock,
  }
})

import { POST } from "./route"
// @ts-expect-error - test-only mocked exports
import { findUniqueMock, updateMock, upsertUsedItemMock, transactionMock } from "@/lib/prisma"

function makeParams(id: string) {
  return { params: Promise.resolve({ id }) }
}

describe("POST /api/items/[id]/used", () => {
  beforeEach(() => {
    findUniqueMock.mockReset()
    updateMock.mockReset()
    upsertUsedItemMock.mockReset()
    transactionMock.mockReset()

    updateMock.mockResolvedValue({ id: "item-1", status: "USED" })
    upsertUsedItemMock.mockResolvedValue({ id: "used-1" })
    transactionMock.mockImplementation((ops: Promise<unknown>[]) => Promise.all(ops))
  })

  it("returns 404 when item does not exist", async () => {
    findUniqueMock.mockResolvedValue(null)

    const response = await POST(new Request("http://localhost/api/items/item-1/used", { method: "POST" }), makeParams("item-1"))

    expect(response.status).toBe(404)
    const body = await response.json()
    expect(body.error).toMatch(/item not found/i)
  })

  it("marks active item as used and stores used-item history", async () => {
    findUniqueMock.mockResolvedValue({
      id: "item-1",
      name: "Milk",
      quantity: 2,
      categoryId: "cat-dairy",
      source: "MANUAL",
      receiptId: null,
      status: "ACTIVE",
    })

    const response = await POST(new Request("http://localhost/api/items/item-1/used", { method: "POST" }), makeParams("item-1"))

    expect(response.status).toBe(200)
    const body = await response.json()
    expect(body).toMatchObject({
      id: "item-1",
      status: "USED",
      changed: true,
    })
    expect(updateMock).toHaveBeenCalledTimes(1)
    expect(upsertUsedItemMock).toHaveBeenCalledTimes(1)
    expect(transactionMock).toHaveBeenCalledTimes(1)
  })

  it("returns changed=false when item is already used", async () => {
    findUniqueMock.mockResolvedValue({ id: "item-1", status: "USED" })

    const response = await POST(new Request("http://localhost/api/items/item-1/used", { method: "POST" }), makeParams("item-1"))

    expect(response.status).toBe(200)
    const body = await response.json()
    expect(body).toMatchObject({
      id: "item-1",
      status: "USED",
      changed: false,
    })
    expect(updateMock).not.toHaveBeenCalled()
    expect(upsertUsedItemMock).not.toHaveBeenCalled()
  })

  it("returns 409 when item status is not ACTIVE", async () => {
    findUniqueMock.mockResolvedValue({ id: "item-1", status: "WASTED" })

    const response = await POST(new Request("http://localhost/api/items/item-1/used", { method: "POST" }), makeParams("item-1"))

    expect(response.status).toBe(409)
    const body = await response.json()
    expect(body.error).toMatch(/only active items/i)
  })
})
