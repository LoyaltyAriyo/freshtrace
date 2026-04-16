import { beforeEach, describe, expect, it, vi } from "vitest"

vi.mock("@/lib/prisma", () => {
  const findUniqueMock = vi.fn()
  const updateMock = vi.fn()
  const upsertUsedItemMock = vi.fn()
  const createNotificationMock = vi.fn()
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
      notification: {
        create: createNotificationMock,
      },
      $transaction: transactionMock,
    },
    findUniqueMock,
    updateMock,
    upsertUsedItemMock,
    createNotificationMock,
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
import {
  createNotificationMock,
  findUniqueMock,
  updateMock,
  upsertUsedItemMock,
  transactionMock,
} from "@/lib/prisma"

function makeParams(id: string) {
  return { params: Promise.resolve({ id }) }
}

describe("POST /api/items/[id]/used", () => {
  beforeEach(() => {
    findUniqueMock.mockReset()
    updateMock.mockReset()
    upsertUsedItemMock.mockReset()
    createNotificationMock.mockReset()
    transactionMock.mockReset()

    updateMock.mockResolvedValue({ id: "item-1", status: "USED" })
    upsertUsedItemMock.mockResolvedValue({ id: "used-1" })
    createNotificationMock.mockResolvedValue({ id: "notification-1" })
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
      userId: "user-123",
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
    expect(createNotificationMock).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          userId: "user-123",
          foodItemId: "item-1",
          type: "INFO",
        }),
      })
    )
    expect(transactionMock).toHaveBeenCalledTimes(1)
  })

  it("returns changed=false when item is already used", async () => {
    findUniqueMock.mockResolvedValue({ id: "item-1", status: "USED", userId: "user-123" })

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
    findUniqueMock.mockResolvedValue({ id: "item-1", status: "WASTED", userId: "user-123" })

    const response = await POST(new Request("http://localhost/api/items/item-1/used", { method: "POST" }), makeParams("item-1"))

    expect(response.status).toBe(409)
    const body = await response.json()
    expect(body.error).toMatch(/only active items/i)
  })

  it("returns 500 when database transaction fails", async () => {
    findUniqueMock.mockResolvedValue({
      id: "item-1",
      name: "Milk",
      quantity: 2,
      categoryId: "cat-dairy",
      source: "MANUAL",
      receiptId: null,
      status: "ACTIVE",
      userId: "user-123",
    })
    transactionMock.mockRejectedValue(new Error("DB connection lost"))

    const response = await POST(new Request("http://localhost/api/items/item-1/used", { method: "POST" }), makeParams("item-1"))

    expect(response.status).toBe(500)
    const body = await response.json()
    expect(body.error).toMatch(/failed to mark item as used/i)
  })
})
