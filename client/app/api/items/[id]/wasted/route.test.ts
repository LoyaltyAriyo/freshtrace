import { beforeEach, describe, expect, it, vi } from "vitest"

const prismaMocks = vi.hoisted(() => ({
  findUniqueMock: vi.fn(),
  updateMock: vi.fn(),
  upsertMock: vi.fn(),
  createNotificationMock: vi.fn(),
  transactionMock: vi.fn(),
}))

vi.mock("@/lib/prisma", () => {
  return {
    prisma: {
      foodItem: {
        findUnique: prismaMocks.findUniqueMock,
        update: prismaMocks.updateMock,
      },
      wastedItem: {
        upsert: prismaMocks.upsertMock,
      },
      notification: {
        create: prismaMocks.createNotificationMock,
      },
      $transaction: prismaMocks.transactionMock,
    },
  }
})

vi.mock("@/lib/auth", () => {
  return {
    getCurrentUserId: vi.fn().mockResolvedValue("user-123"),
  }
})

import { POST } from "./route"
const {
  createNotificationMock,
  findUniqueMock,
  updateMock,
  upsertMock,
  transactionMock,
} = prismaMocks

function makeParams(id: string) {
  return { params: Promise.resolve({ id }) }
}

describe("POST /api/items/[id]/wasted", () => {
  beforeEach(() => {
    findUniqueMock.mockReset()
    updateMock.mockReset()
    upsertMock.mockReset()
    createNotificationMock.mockReset()
    transactionMock.mockReset()
    createNotificationMock.mockResolvedValue({ id: "notification-1" })
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
    updateMock.mockResolvedValue({ id: "item-1", status: "WASTED" })
    upsertMock.mockResolvedValue({ id: "wasted-1" })
    transactionMock.mockImplementation((ops: Promise<unknown>[]) => Promise.all(ops))

    const response = await POST(new Request("http://localhost/api/items/item-1/wasted", { method: "POST" }), makeParams("item-1"))

    expect(response.status).toBe(200)
    const body = await response.json()
    expect(body).toMatchObject({
      id: "item-1",
      status: "WASTED",
      changed: true,
    })
    expect(transactionMock).toHaveBeenCalledTimes(1)
    expect(transactionMock.mock.calls[0]?.[0]).toHaveLength(3)
    // Ensure the route actually attempts to persist the wasted-item history entry.
    expect(updateMock).toHaveBeenCalledTimes(1)
    expect(upsertMock).toHaveBeenCalledTimes(1)
    expect(createNotificationMock).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          userId: "user-123",
          foodItemId: "item-1",
          type: "WARNING",
        }),
      })
    )
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
