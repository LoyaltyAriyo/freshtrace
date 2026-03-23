import { describe, it, expect, vi, beforeEach } from "vitest"

vi.mock("@/lib/prisma", () => {
  const findUniqueMock = vi.fn()
  const createManyMock = vi.fn()
  const findCategoriesMock = vi.fn()

  return {
    prisma: {
      receipt: {
        findUnique: findUniqueMock,
      },
      category: {
        findMany: findCategoriesMock,
      },
      foodItem: {
        createMany: createManyMock,
      },
    },
    findUniqueMock,
    createManyMock,
    findCategoriesMock,
  }
})

import { GET, POST } from "./route"
// @ts-expect-error - test-only mocked exports
import { findUniqueMock, createManyMock, findCategoriesMock } from "@/lib/prisma"

const RECEIPT_ID = "receipt-abc"

function makeRequest(method: string, body?: unknown) {
  return new Request(`http://localhost/api/receipts/${RECEIPT_ID}/review`, {
    method,
    headers: body ? { "Content-Type": "application/json" } : {},
    body: body ? JSON.stringify(body) : undefined,
  })
}

function makeParams(id = RECEIPT_ID) {
  return { params: Promise.resolve({ id }) }
}

// ---------------------------------------------------------------------------
// GET /api/receipts/[id]/review
// ---------------------------------------------------------------------------

describe("GET /api/receipts/[id]/review", () => {
  beforeEach(() => {
    findUniqueMock.mockReset()
  })

  it("returns 404 when receipt does not exist", async () => {
    findUniqueMock.mockResolvedValue(null)

    const response = await GET(makeRequest("GET"), makeParams())

    expect(response.status).toBe(404)
    const body = await response.json()
    expect(body.error).toMatch(/not found/i)
  })

  it("returns receipt with its draft items", async () => {
    findUniqueMock.mockResolvedValue({
      id: RECEIPT_ID,
      ocrStatus: "SUCCESS",
      imagePath: "uploads/receipt.jpg",
      draftItems: [
        {
          id: "draft-1",
          name: "Milk",
          quantity: 2,
          categoryId: "cat-dairy",
          confidence: 0.95,
          isSelected: true,
        },
        {
          id: "draft-2",
          name: "Bread",
          quantity: 1,
          categoryId: null,
          confidence: 0.72,
          isSelected: true,
        },
      ],
    })

    const response = await GET(makeRequest("GET"), makeParams())

    expect(response.status).toBe(200)
    const body = await response.json()
    expect(body.id).toBe(RECEIPT_ID)
    expect(body.ocrStatus).toBe("SUCCESS")
    expect(body.draftItems).toHaveLength(2)
    expect(body.draftItems[0]).toMatchObject({
      id: "draft-1",
      name: "Milk",
      quantity: 2,
    })
  })

  it("returns empty draftItems array when receipt has no draft items", async () => {
    findUniqueMock.mockResolvedValue({
      id: RECEIPT_ID,
      ocrStatus: "PENDING",
      imagePath: "uploads/receipt.jpg",
      draftItems: [],
    })

    const response = await GET(makeRequest("GET"), makeParams())

    expect(response.status).toBe(200)
    const body = await response.json()
    expect(body.draftItems).toEqual([])
  })
})

// ---------------------------------------------------------------------------
// POST /api/receipts/[id]/review
// ---------------------------------------------------------------------------

describe("POST /api/receipts/[id]/review", () => {
  beforeEach(() => {
    findUniqueMock.mockReset()
    createManyMock.mockReset()
    findCategoriesMock.mockReset()
    findCategoriesMock.mockResolvedValue([
      { id: "cat-dairy" },
      { id: "cat-bakery" },
      { id: "cat-other" },
    ])
  })

  it("returns 400 when request body is missing selectedItemIds", async () => {
    const response = await POST(makeRequest("POST", {}), makeParams())

    expect(response.status).toBe(400)
    const body = await response.json()
    expect(body.error).toMatch(/selectedItemIds/i)
  })

  it("returns 400 when selectedItemIds is not an array", async () => {
    const response = await POST(
      makeRequest("POST", { selectedItemIds: "draft-1" }),
      makeParams()
    )

    expect(response.status).toBe(400)
    const body = await response.json()
    expect(body.error).toMatch(/selectedItemIds/i)
  })

  it("returns 400 when selectedItemIds is an empty array", async () => {
    const response = await POST(
      makeRequest("POST", { selectedItemIds: [] }),
      makeParams()
    )

    expect(response.status).toBe(400)
    const body = await response.json()
    expect(body.error).toMatch(/at least one item/i)
  })

  it("returns 404 when receipt does not exist", async () => {
    findUniqueMock.mockResolvedValue(null)

    const response = await POST(
      makeRequest("POST", { selectedItemIds: ["draft-1"] }),
      makeParams()
    )

    expect(response.status).toBe(404)
    const body = await response.json()
    expect(body.error).toMatch(/not found/i)
  })

  it("returns 422 when a selected draft item has no category", async () => {
    findUniqueMock.mockResolvedValue({
      id: RECEIPT_ID,
      draftItems: [
        {
          id: "draft-1",
          name: "Unknown Item",
          quantity: 1,
          categoryId: null,
          isSelected: true,
        },
      ],
    })

    const response = await POST(
      makeRequest("POST", { selectedItemIds: ["draft-1"] }),
      makeParams()
    )

    expect(response.status).toBe(422)
    const body = await response.json()
    expect(body.error).toMatch(/category/i)
  })

  it("creates food items for selected draft items and returns 201", async () => {
    findUniqueMock.mockResolvedValue({
      id: RECEIPT_ID,
      draftItems: [
        {
          id: "draft-1",
          name: "Milk",
          quantity: 2,
          categoryId: "cat-dairy",
          isSelected: true,
        },
        {
          id: "draft-2",
          name: "Bread",
          quantity: 1,
          categoryId: "cat-bakery",
          isSelected: true,
        },
      ],
    })
    createManyMock.mockResolvedValue({ count: 2 })

    const response = await POST(
      makeRequest("POST", { selectedItemIds: ["draft-1", "draft-2"] }),
      makeParams()
    )

    expect(response.status).toBe(201)
    const body = await response.json()
    expect(body.savedCount).toBe(2)
    expect(createManyMock).toHaveBeenCalledTimes(1)

    const createdData = createManyMock.mock.calls[0][0].data as Array<{
      name: string
      receiptId: string
      source: string
    }>
    expect(createdData).toHaveLength(2)
    expect(createdData[0]).toMatchObject({
      name: "Milk",
      receiptId: RECEIPT_ID,
      source: "RECEIPT",
    })
  })

  it("only saves selected items, ignores unselected ones", async () => {
    findUniqueMock.mockResolvedValue({
      id: RECEIPT_ID,
      draftItems: [
        {
          id: "draft-1",
          name: "Milk",
          quantity: 2,
          categoryId: "cat-dairy",
          isSelected: true,
        },
        {
          id: "draft-2",
          name: "Mystery Item",
          quantity: 1,
          categoryId: "cat-other",
          isSelected: false,
        },
      ],
    })
    createManyMock.mockResolvedValue({ count: 1 })

    const response = await POST(
      makeRequest("POST", { selectedItemIds: ["draft-1"] }),
      makeParams()
    )

    expect(response.status).toBe(201)
    const createdData = createManyMock.mock.calls[0][0].data as Array<{
      name: string
    }>
    expect(createdData).toHaveLength(1)
    expect(createdData[0].name).toBe("Milk")
  })

  it("returns 500 when database write fails", async () => {
    findUniqueMock.mockResolvedValue({
      id: RECEIPT_ID,
      draftItems: [
        {
          id: "draft-1",
          name: "Milk",
          quantity: 2,
          categoryId: "cat-dairy",
          isSelected: true,
        },
      ],
    })
    createManyMock.mockRejectedValue(new Error("db error"))

    const response = await POST(
      makeRequest("POST", { selectedItemIds: ["draft-1"] }),
      makeParams()
    )

    expect(response.status).toBe(500)
    const body = await response.json()
    expect(body.error).toMatch(/failed to save/i)
  })

  it("returns 400 when edited item has invalid quantity", async () => {
    const response = await POST(
      makeRequest("POST", {
        selectedItemIds: ["draft-1"],
        editedItems: [
          {
            id: "draft-1",
            name: "Milk",
            quantity: 0,
            categoryId: "cat-dairy",
          },
        ],
      }),
      makeParams()
    )

    expect(response.status).toBe(400)
    const body = await response.json()
    expect(body.error).toMatch(/invalid quantity/i)
  })

  it("uses edited item values when saving", async () => {
    findUniqueMock.mockResolvedValue({
      id: RECEIPT_ID,
      draftItems: [
        {
          id: "draft-1",
          name: "Old Name",
          quantity: 2,
          categoryId: "cat-dairy",
          isSelected: true,
        },
      ],
    })
    createManyMock.mockResolvedValue({ count: 1 })

    const response = await POST(
      makeRequest("POST", {
        selectedItemIds: ["draft-1"],
        editedItems: [
          {
            id: "draft-1",
            name: "Updated Milk",
            quantity: 4,
            categoryId: "cat-bakery",
          },
        ],
      }),
      makeParams()
    )

    expect(response.status).toBe(201)
    const createdData = createManyMock.mock.calls[0][0].data as Array<{
      name: string
      quantity: number
      categoryId: string
    }>
    expect(createdData[0]).toMatchObject({
      name: "Updated Milk",
      quantity: 4,
      categoryId: "cat-bakery",
    })
  })

  it("returns 422 when an edited item category is invalid", async () => {
    findUniqueMock.mockResolvedValue({
      id: RECEIPT_ID,
      draftItems: [
        {
          id: "draft-1",
          name: "Milk",
          quantity: 2,
          categoryId: "cat-dairy",
          isSelected: true,
        },
      ],
    })
    findCategoriesMock.mockResolvedValue([])

    const response = await POST(
      makeRequest("POST", {
        selectedItemIds: ["draft-1"],
        editedItems: [
          {
            id: "draft-1",
            name: "Milk",
            quantity: 2,
            categoryId: "cat-unknown",
          },
        ],
      }),
      makeParams()
    )

    expect(response.status).toBe(422)
    const body = await response.json()
    expect(body.error).toMatch(/invalid category/i)
  })
})
