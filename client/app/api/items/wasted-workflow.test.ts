import { beforeEach, describe, expect, it, vi } from "vitest"

vi.mock("@/lib/prisma", () => {
  const findUniqueMock = vi.fn()
  const updateMock = vi.fn()
  const upsertMock = vi.fn()
  const transactionMock = vi.fn()
  const findManyMock = vi.fn()

  return {
    prisma: {
      foodItem: {
        findUnique: findUniqueMock,
        update: updateMock,
        findMany: findManyMock,
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
    findManyMock,
  }
})

import { POST as markItemWasted } from "./[id]/wasted/route"
import { GET as getActiveItems } from "./route"
// @ts-expect-error - test-only mocked exports
import {
  findUniqueMock,
  updateMock,
  upsertMock,
  transactionMock,
  findManyMock,
} from "@/lib/prisma"

function makeParams(id: string | undefined) {
  return { params: Promise.resolve({ id } as { id: string }) }
}

describe("Wasted items workflow", () => {
  beforeEach(() => {
    findUniqueMock.mockReset()
    updateMock.mockReset()
    upsertMock.mockReset()
    transactionMock.mockReset()
    findManyMock.mockReset()
  })

  it("marks ACTIVE item as WASTED and persists wasted history", async () => {
    findUniqueMock.mockResolvedValue({
      id: "item-waste-1",
      name: "Chicken",
      quantity: 1,
      categoryId: "cat-meat",
      source: "RECEIPT",
      receiptId: "receipt-1",
      status: "ACTIVE",
    })

    updateMock.mockResolvedValue({
      id: "item-waste-1",
      status: "WASTED",
    })

    upsertMock.mockResolvedValue({ id: "wasted-1" })
    transactionMock.mockImplementation((ops: Promise<unknown>[]) => Promise.all(ops))

    const response = await markItemWasted(
      new Request("http://localhost/api/items/item-waste-1/wasted", { method: "POST" }),
      makeParams("item-waste-1"),
    )

    expect(response.status).toBe(200)
    const body = await response.json()
    expect(body).toMatchObject({
      id: "item-waste-1",
      status: "WASTED",
      changed: true,
    })

    expect(updateMock).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { id: "item-waste-1" },
        data: expect.objectContaining({ status: "WASTED" }),
      }),
    )
    expect(upsertMock).toHaveBeenCalledTimes(1)
  })

  it("returns 404 when item to waste is not found", async () => {
    findUniqueMock.mockResolvedValue(null)

    const response = await markItemWasted(
      new Request("http://localhost/api/items/missing-item/wasted", { method: "POST" }),
      makeParams("missing-item"),
    )

    expect(response.status).toBe(404)
    const body = await response.json()
    expect(body.error).toMatch(/item not found/i)

    expect(updateMock).not.toHaveBeenCalled()
    expect(upsertMock).not.toHaveBeenCalled()
    expect(transactionMock).not.toHaveBeenCalled()
  })

  it("returns 400 when item id is missing or empty", async () => {
    const response = await markItemWasted(
      new Request("http://localhost/api/items//wasted", { method: "POST" }),
      makeParams(""),
    )

    expect(response.status).toBe(400)
    const body = await response.json()
    expect(body.error).toMatch(/item id is required/i)

    expect(findUniqueMock).not.toHaveBeenCalled()
    expect(updateMock).not.toHaveBeenCalled()
    expect(upsertMock).not.toHaveBeenCalled()
    expect(transactionMock).not.toHaveBeenCalled()
  })

  it("does not re-mark an already WASTED item", async () => {
    findUniqueMock.mockResolvedValue({
      id: "item-waste-2",
      status: "WASTED",
    })

    const response = await markItemWasted(
      new Request("http://localhost/api/items/item-waste-2/wasted", { method: "POST" }),
      makeParams("item-waste-2"),
    )

    expect(response.status).toBe(200)
    const body = await response.json()
    expect(body).toMatchObject({
      id: "item-waste-2",
      status: "WASTED",
      changed: false,
    })

    expect(updateMock).not.toHaveBeenCalled()
    expect(upsertMock).not.toHaveBeenCalled()
    expect(transactionMock).not.toHaveBeenCalled()
  })

  it("uses a Prisma transaction to update food and wasted records together", async () => {
    findUniqueMock.mockResolvedValue({
      id: "item-waste-3",
      name: "Yogurt",
      quantity: 1,
      categoryId: "cat-dairy",
      source: "MANUAL",
      receiptId: null,
      status: "ACTIVE",
    })

    updateMock.mockResolvedValue({
      id: "item-waste-3",
      status: "WASTED",
    })
    upsertMock.mockResolvedValue({ id: "wasted-3" })

    transactionMock.mockImplementation((ops: Promise<unknown>[]) => Promise.all(ops))

    const response = await markItemWasted(
      new Request("http://localhost/api/items/item-waste-3/wasted", { method: "POST" }),
      makeParams("item-waste-3"),
    )

    expect(response.status).toBe(200)

    expect(transactionMock).toHaveBeenCalledTimes(1)
    const callArgs = transactionMock.mock.calls[0]?.[0]
    expect(Array.isArray(callArgs)).toBe(true)
    expect(callArgs).toHaveLength(2)
    expect(updateMock).toHaveBeenCalledTimes(1)
    expect(upsertMock).toHaveBeenCalledTimes(1)
  })

  it("ensures WASTED items are not returned in ACTIVE food list", async () => {
    // First, mark an ACTIVE item as wasted.
    findUniqueMock.mockResolvedValue({
      id: "item-waste-4",
      name: "Bread",
      quantity: 1,
      categoryId: "cat-bakery",
      source: "MANUAL",
      receiptId: null,
      status: "ACTIVE",
    })

    updateMock.mockResolvedValue({
      id: "item-waste-4",
      status: "WASTED",
    })
    upsertMock.mockResolvedValue({ id: "wasted-4" })
    transactionMock.mockImplementation((ops: Promise<unknown>[]) => Promise.all(ops))

    await markItemWasted(
      new Request("http://localhost/api/items/item-waste-4/wasted", { method: "POST" }),
      makeParams("item-waste-4"),
    )

    // Then, simulate querying ACTIVE food items.
    findManyMock.mockResolvedValue([
      {
        id: "other-active-item",
        name: "Milk",
        quantity: 2,
        dateAdded: new Date("2026-03-20T00:00:00.000Z"),
        status: "ACTIVE",
        category: { name: "Dairy" },
      },
    ])

    const response = await getActiveItems()

    expect(response.status).toBe(200)
    const body = await response.json()

    expect(Array.isArray(body)).toBe(true)
    expect(body.some((item: { id: string }) => item.id === "item-waste-4")).toBe(false)
    expect(findManyMock).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { status: "ACTIVE" },
      }),
    )
  })
})

