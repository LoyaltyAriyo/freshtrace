import { beforeEach, describe, expect, it, vi } from "vitest"

vi.mock("@/lib/prisma", () => {
  const findUniqueMock = vi.fn()
  const updateMock = vi.fn()
  const findManyMock = vi.fn()
  const upsertUsedItemMock = vi.fn()
  const upsertWastedItemMock = vi.fn()
  const createNotificationMock = vi.fn()
  const transactionMock = vi.fn()

  return {
    prisma: {
      foodItem: {
        findUnique: findUniqueMock,
        update: updateMock,
        findMany: findManyMock,
      },
      usedItem: {
        upsert: upsertUsedItemMock,
      },
      wastedItem: {
        upsert: upsertWastedItemMock,
      },
      notification: {
        create: createNotificationMock,
      },
      $transaction: transactionMock,
    },
    findUniqueMock,
    updateMock,
    findManyMock,
    upsertUsedItemMock,
    upsertWastedItemMock,
    createNotificationMock,
    transactionMock,
  }
})

vi.mock("@/lib/auth", () => {
  return {
    getCurrentUserId: vi.fn().mockResolvedValue("user-123"),
  }
})

import { GET as getActiveItems } from "./route"
import { POST as markItemUsed } from "./[id]/used/route"
import { POST as markItemWasted } from "./[id]/wasted/route"
// @ts-expect-error - test-only mocked exports
import {
  createNotificationMock,
  findUniqueMock,
  updateMock,
  findManyMock,
  upsertUsedItemMock,
  upsertWastedItemMock,
  transactionMock,
} from "@/lib/prisma"

function makeParams(id: string | undefined) {
  return { params: Promise.resolve({ id } as { id: string }) }
}

describe("Food item status updates (USED/WASTED)", () => {
  beforeEach(() => {
    findUniqueMock.mockReset()
    updateMock.mockReset()
    findManyMock.mockReset()
    upsertUsedItemMock.mockReset()
    upsertWastedItemMock.mockReset()
    createNotificationMock.mockReset()
    transactionMock.mockReset()
  })

  it("marks ACTIVE item as USED with correct prisma update call", async () => {
    findUniqueMock.mockResolvedValue({
      id: "item-used-1",
      name: "Milk",
      quantity: 2,
      categoryId: "cat-dairy",
      source: "MANUAL",
      receiptId: null,
      status: "ACTIVE",
      userId: "user-123",
    })

    updateMock.mockResolvedValue({
      id: "item-used-1",
      status: "USED",
    })

    upsertUsedItemMock.mockResolvedValue({ id: "used-1" })
    createNotificationMock.mockResolvedValue({ id: "notification-1" })
    transactionMock.mockImplementation((ops: Promise<unknown>[]) => Promise.all(ops))

    const response = await markItemUsed(
      new Request("http://localhost/api/items/item-used-1/used", { method: "POST" }),
      makeParams("item-used-1"),
    )

    expect(response.status).toBe(200)
    const body = await response.json()
    expect(body).toMatchObject({
      id: "item-used-1",
      status: "USED",
      changed: true,
    })

    expect(updateMock).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { id: "item-used-1" },
        data: expect.objectContaining({ status: "USED" }),
      }),
    )
  })

  it("marks ACTIVE item as WASTED with correct prisma update call", async () => {
    findUniqueMock.mockResolvedValue({
      id: "item-wasted-1",
      name: "Chicken",
      quantity: 1,
      categoryId: "cat-meat",
      source: "RECEIPT",
      receiptId: "receipt-1",
      status: "ACTIVE",
      userId: "user-123",
    })

    updateMock.mockResolvedValue({
      id: "item-wasted-1",
      status: "WASTED",
    })

    upsertWastedItemMock.mockResolvedValue({ id: "wasted-1" })
    createNotificationMock.mockResolvedValue({ id: "notification-1" })
    transactionMock.mockImplementation((ops: Promise<unknown>[]) => Promise.all(ops))

    const response = await markItemWasted(
      new Request("http://localhost/api/items/item-wasted-1/wasted", { method: "POST" }),
      makeParams("item-wasted-1"),
    )

    expect(response.status).toBe(200)
    const body = await response.json()
    expect(body).toMatchObject({
      id: "item-wasted-1",
      status: "WASTED",
      changed: true,
    })

    expect(updateMock).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { id: "item-wasted-1" },
        data: expect.objectContaining({ status: "WASTED" }),
      }),
    )
  })

  it("returns 404 for non-existent item id when updating status", async () => {
    findUniqueMock.mockResolvedValue(null)

    const response = await markItemUsed(
      new Request("http://localhost/api/items/missing-item/used", { method: "POST" }),
      makeParams("missing-item"),
    )

    expect(response.status).toBe(404)
    const body = await response.json()
    expect(body.error).toMatch(/item not found/i)
    expect(updateMock).not.toHaveBeenCalled()
  })

  it("returns 400 when item id is missing or empty", async () => {
    const response = await markItemUsed(
      new Request("http://localhost/api/items//used", { method: "POST" }),
      makeParams(""),
    )

    expect(response.status).toBe(400)
    const body = await response.json()
    expect(body.error).toMatch(/item id is required/i)
    expect(findUniqueMock).not.toHaveBeenCalled()
    expect(updateMock).not.toHaveBeenCalled()
  })

  it("does not re-update an already USED item", async () => {
    findUniqueMock.mockResolvedValue({
      id: "item-used-2",
      status: "USED",
      userId: "user-123",
    })

    const response = await markItemUsed(
      new Request("http://localhost/api/items/item-used-2/used", { method: "POST" }),
      makeParams("item-used-2"),
    )

    expect(response.status).toBe(200)
    const body = await response.json()
    expect(body).toMatchObject({
      id: "item-used-2",
      status: "USED",
      changed: false,
    })

    expect(updateMock).not.toHaveBeenCalled()
    expect(upsertUsedItemMock).not.toHaveBeenCalled()
    expect(transactionMock).not.toHaveBeenCalled()
  })

  it("does not re-update an already WASTED item", async () => {
    findUniqueMock.mockResolvedValue({
      id: "item-wasted-2",
      status: "WASTED",
      userId: "user-123",
    })

    const response = await markItemWasted(
      new Request("http://localhost/api/items/item-wasted-2/wasted", { method: "POST" }),
      makeParams("item-wasted-2"),
    )

    expect(response.status).toBe(200)
    const body = await response.json()
    expect(body).toMatchObject({
      id: "item-wasted-2",
      status: "WASTED",
      changed: false,
    })

    expect(updateMock).not.toHaveBeenCalled()
    expect(upsertWastedItemMock).not.toHaveBeenCalled()
    expect(transactionMock).not.toHaveBeenCalled()
  })

  it("ensures items marked USED/WASTED are excluded from ACTIVE list", async () => {
    findUniqueMock.mockResolvedValue({
      id: "item-3",
      name: "Yogurt",
      quantity: 1,
      categoryId: "cat-dairy",
      source: "MANUAL",
      receiptId: null,
      status: "ACTIVE",
      userId: "user-123",
    })

    updateMock.mockResolvedValue({
      id: "item-3",
      status: "USED",
    })
    upsertUsedItemMock.mockResolvedValue({ id: "used-3" })
    createNotificationMock.mockResolvedValue({ id: "notification-1" })
    transactionMock.mockImplementation((ops: Promise<unknown>[]) => Promise.all(ops))

    await markItemUsed(
      new Request("http://localhost/api/items/item-3/used", { method: "POST" }),
      makeParams("item-3"),
    )

    findManyMock.mockResolvedValue([
      {
        id: "other-active-item",
        name: "Bread",
        quantity: 1,
        dateAdded: new Date("2026-03-20T00:00:00.000Z"),
        status: "ACTIVE",
        category: { name: "Bakery" },
      },
    ])

    const response = await getActiveItems(
      new Request("http://localhost/api/items"),
    )

    expect(response.status).toBe(200)
    await response.json()

    expect(findManyMock).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { status: "ACTIVE", userId: "user-123" },
      }),
    )
  })
})
