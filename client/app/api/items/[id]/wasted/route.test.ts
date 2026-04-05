import { beforeEach, describe, expect, it, vi } from "vitest"

vi.mock("@/lib/prisma", () => {
  const findUniqueMock = vi.fn()
  const updateMock = vi.fn()
  const upsertMock = vi.fn()
  const transactionMock = vi.fn()

  return {
    prisma: {
      foodItem: {
        findUnique: findUniqueMock,
        update: updateMock,
      },
      wastedItem: {
        upsert: upsertMock,
      },
      $transaction: transactionMock,
    },
    findUniqueMock,
    updateMock,
    upsertMock,
    transactionMock,
  }
})

vi.mock("@/lib/auth", () => {
  return {
    getCurrentUserId: vi.fn().mockResolvedValue("user-123"),
  }
})

import { POST } from "./route"
// @ts-expect-error - test-only mocked exports
import { findUniqueMock, updateMock, upsertMock, transactionMock } from "@/lib/prisma"

function makeParams(id: string) {
  return { params: Promise.resolve({ id }) }
}

describe("POST /api/items/[id]/wasted", () => {
  beforeEach(() => {
    findUniqueMock.mockReset()
    updateMock.mockReset()
    upsertMock.mockReset()
    transactionMock.mockReset()
  })

  it("returns 404 when item does not exist", async () => {
    findUniqueMock.mockResolvedValue(null)

    const response = await POST(new Request("http://localhost/api/items/item-1/wasted", { method: "POST" }), makeParams("item-1"))

    expect(response.status).toBe(404)
    const body = await response.json()
    expect(body.error).toMatch(/item not found/i)
  })

  it("marks active item as wasted", async () => {
    findUniqueMock.mockResolvedValue({
      id: "item-1",
      name: "Chicken",
      quantity: 1,
      categoryId: "cat-meat",
      source: "RECEIPT",
      receiptId: "receipt-1",
      status: "ACTIVE",
      userId: "user-123",
    })
    transactionMock.mockResolvedValue([{ id: "item-1", status: "WASTED" }, { id: "wasted-1" }])

    const response = await POST(new Request("http://localhost/api/items/item-1/wasted", { method: "POST" }), makeParams("item-1"))

    expect(response.status).toBe(200)
    const body = await response.json()
    expect(body).toMatchObject({
      id: "item-1",
      status: "WASTED",
      changed: true,
    })
    expect(transactionMock).toHaveBeenCalledTimes(1)
    // Ensure the route actually attempts to persist the wasted-item history entry.
    expect(updateMock).toHaveBeenCalledTimes(1)
    expect(upsertMock).toHaveBeenCalledTimes(1)
  })

  it("returns changed=false when item is already wasted", async () => {
    findUniqueMock.mockResolvedValue({ id: "item-1", status: "WASTED", userId: "user-123" })

    const response = await POST(new Request("http://localhost/api/items/item-1/wasted", { method: "POST" }), makeParams("item-1"))

    expect(response.status).toBe(200)
    const body = await response.json()
    expect(body).toMatchObject({
      id: "item-1",
      status: "WASTED",
      changed: false,
    })
    expect(transactionMock).not.toHaveBeenCalled()
  })

  it("returns 409 when item status is not ACTIVE", async () => {
    findUniqueMock.mockResolvedValue({ id: "item-1", status: "USED", userId: "user-123" })

    const response = await POST(new Request("http://localhost/api/items/item-1/wasted", { method: "POST" }), makeParams("item-1"))

    expect(response.status).toBe(409)
    const body = await response.json()
    expect(body.error).toMatch(/only active items/i)
  })

  it("returns 500 when database update fails", async () => {
    findUniqueMock.mockResolvedValue({
      id: "item-1",
      name: "Chicken",
      quantity: 1,
      categoryId: "cat-meat",
      source: "RECEIPT",
      receiptId: null,
      status: "ACTIVE",
      userId: "user-123",
    })
    transactionMock.mockRejectedValue(new Error("DB connection lost"))

    const response = await POST(new Request("http://localhost/api/items/item-1/wasted", { method: "POST" }), makeParams("item-1"))

    expect(response.status).toBe(500)
    const body = await response.json()
    expect(body.error).toMatch(/failed to mark item as wasted/i)
  })
})
