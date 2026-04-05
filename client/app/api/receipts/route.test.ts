import { describe, it, expect, vi, beforeEach } from "vitest"

vi.mock("@/lib/supabase/server", () => {
  const uploadMock = vi.fn()
  const removeMock = vi.fn()
  const downloadMock = vi.fn()

  return {
    supabaseAdmin: {
      storage: {
        from: vi.fn(() => ({
          upload: uploadMock,
          remove: removeMock,
          download: downloadMock,
        })),
      },
    },
    uploadMock,
    removeMock,
    downloadMock,
  }
})

vi.mock("@/lib/auth", () => {
  return {
    getCurrentUserId: vi.fn().mockResolvedValue("user-123"),
  }
})

vi.mock("@/lib/prisma", () => {
  const createReceiptMock = vi.fn()
  const updateReceiptMock = vi.fn()
  const createDraftItemsMock = vi.fn()
  const findCategoriesMock = vi.fn()
  const createCategoriesMock = vi.fn()

  return {
    prisma: {
      receipt: {
        create: createReceiptMock,
        update: updateReceiptMock,
      },
      receiptItemDraft: {
        createMany: createDraftItemsMock,
      },
      category: {
        findMany: findCategoriesMock,
        createMany: createCategoriesMock,
      },
    },
    createReceiptMock,
    updateReceiptMock,
    createDraftItemsMock,
    findCategoriesMock,
    createCategoriesMock,
  }
})

vi.mock("@/lib/ocr", () => {
  const extractReceiptDraftItemsMock = vi.fn()

  return {
    extractReceiptDraftItems: extractReceiptDraftItemsMock,
    extractReceiptDraftItemsMock,
  }
})

// Import after mocks so that the route uses the mocked dependencies
import { POST } from "./route"
// @ts-expect-error - test-only mocked exports
import { uploadMock, removeMock, downloadMock } from "@/lib/supabase/server"
// @ts-expect-error - test-only mocked exports
import { createReceiptMock } from "@/lib/prisma"
// @ts-expect-error - test-only mocked exports
import { updateReceiptMock, createDraftItemsMock, findCategoriesMock, createCategoriesMock } from "@/lib/prisma"
// @ts-expect-error - test-only mocked exports
import { extractReceiptDraftItemsMock } from "@/lib/ocr"

describe("POST /api/receipts route", () => {
  beforeEach(() => {
    uploadMock.mockReset()
    removeMock.mockReset()
    downloadMock.mockReset()
    createReceiptMock.mockReset()
    updateReceiptMock.mockReset()
    createDraftItemsMock.mockReset()
    findCategoriesMock.mockReset()
    createCategoriesMock.mockReset()
    extractReceiptDraftItemsMock.mockReset()
    findCategoriesMock.mockResolvedValue([
      { id: "cat-dairy", name: "Dairy", shelfLifeDays: 10 },
      { id: "cat-bakery", name: "Bakery", shelfLifeDays: 5 },
      { id: "cat-other", name: "Other", shelfLifeDays: 14 },
    ])
  })

  it("returns 400 when no file is uploaded", async () => {
    const formData = new FormData()

    const request = new Request("http://localhost/api/receipts", {
      method: "POST",
      body: formData as FormData,
    })

    const response = await POST(request)

    expect(response.status).toBe(400)
    const body = await response.json()
    expect(body.error).toMatch(/No receipt file uploaded/i)
  })

  it("returns 400 for invalid MIME type", async () => {
    const formData = new FormData()
    formData.append(
      "receipt",
      new File(["data"], "test.txt", { type: "text/plain" })
    )

    const request = new Request("http://localhost/api/receipts", {
      method: "POST",
      body: formData as FormData,
    })

    const response = await POST(request)

    expect(response.status).toBe(400)
    const body = await response.json()
    expect(body.error).toMatch(/Invalid file type/i)
  })

  it("returns 400 for oversized file", async () => {
    const formData = new FormData()
    const bigFile = new File(
      [new Uint8Array(10 * 1024 * 1024 + 1)],
      "big.jpg",
      { type: "image/jpeg" }
    )
    formData.append("receipt", bigFile)

    const request = new Request("http://localhost/api/receipts", {
      method: "POST",
      body: formData as FormData,
    })

    const response = await POST(request)

    expect(response.status).toBe(400)
    const body = await response.json()
    expect(body.error).toMatch(/File is too large/i)
  })

  it("returns success JSON with receiptId for a valid upload", async () => {
    uploadMock.mockResolvedValue({ error: null })
    downloadMock.mockResolvedValue({
      data: new Blob([new Uint8Array([1, 2, 3])], { type: "image/jpeg" }),
      error: null,
    })
    createReceiptMock.mockResolvedValue({
      id: "receipt-123",
    })
    extractReceiptDraftItemsMock.mockResolvedValue({
      items: [
        { name: "Milk", quantity: 2, confidence: 0.88 },
      ],
      fallbackUsed: false,
    })
    updateReceiptMock.mockResolvedValue({ id: "receipt-123", ocrStatus: "SUCCESS" })
    createDraftItemsMock.mockResolvedValue({ count: 1 })

    const formData = new FormData()
    formData.append(
      "receipt",
      new File(["data"], "receipt.jpg", { type: "image/jpeg" })
    )

    const request = new Request("http://localhost/api/receipts", {
      method: "POST",
      body: formData as FormData,
    })

    const response = await POST(request)

    expect(response.status).toBe(201)
    const body = await response.json()
    expect(body.receiptId).toBe("receipt-123")
    expect(body.ocrStatus).toBe("SUCCESS")
    expect(uploadMock).toHaveBeenCalledTimes(1)
    expect(downloadMock).toHaveBeenCalledTimes(1)
    expect(createReceiptMock).toHaveBeenCalledTimes(1)
    expect(createDraftItemsMock).toHaveBeenCalledTimes(1)
    expect(updateReceiptMock).toHaveBeenCalledWith({
      where: { id: "receipt-123" },
      data: { ocrStatus: "SUCCESS" },
    })
    expect(createDraftItemsMock).toHaveBeenCalledWith({
      data: [
        expect.objectContaining({
          name: "Milk",
          categoryId: "cat-dairy",
        }),
      ],
    })
  })

  it("sets FALLBACK_USED when fallback parser extracts items", async () => {
    uploadMock.mockResolvedValue({ error: null })
    downloadMock.mockResolvedValue({
      data: new Blob([new Uint8Array([1, 2, 3])], { type: "image/jpeg" }),
      error: null,
    })
    createReceiptMock.mockResolvedValue({ id: "receipt-123" })
    extractReceiptDraftItemsMock.mockResolvedValue({
      items: [{ name: "Bread", quantity: 1, confidence: null }],
      fallbackUsed: true,
    })
    createDraftItemsMock.mockResolvedValue({ count: 1 })
    updateReceiptMock.mockResolvedValue({ id: "receipt-123", ocrStatus: "FALLBACK_USED" })

    const formData = new FormData()
    formData.append(
      "receipt",
      new File(["data"], "receipt.jpg", { type: "image/jpeg" })
    )

    const request = new Request("http://localhost/api/receipts", {
      method: "POST",
      body: formData as FormData,
    })

    const response = await POST(request)

    expect(response.status).toBe(201)
    const body = await response.json()
    expect(body.ocrStatus).toBe("FALLBACK_USED")
  })

  it("creates default categories before matching when none exist yet", async () => {
    uploadMock.mockResolvedValue({ error: null })
    downloadMock.mockResolvedValue({
      data: new Blob([new Uint8Array([1, 2, 3])], { type: "image/jpeg" }),
      error: null,
    })
    createReceiptMock.mockResolvedValue({ id: "receipt-123" })
    findCategoriesMock.mockResolvedValueOnce([]).mockResolvedValueOnce([
      { id: "cat-dairy", name: "Dairy", shelfLifeDays: 10 },
    ])
    createCategoriesMock.mockResolvedValue({ count: 10 })
    extractReceiptDraftItemsMock.mockResolvedValue({
      items: [{ name: "Milk", quantity: 1, confidence: 0.9 }],
      fallbackUsed: false,
    })
    createDraftItemsMock.mockResolvedValue({ count: 1 })
    updateReceiptMock.mockResolvedValue({ id: "receipt-123", ocrStatus: "SUCCESS" })

    const formData = new FormData()
    formData.append(
      "receipt",
      new File(["data"], "receipt.jpg", { type: "image/jpeg" })
    )

    const request = new Request("http://localhost/api/receipts", {
      method: "POST",
      body: formData as FormData,
    })

    const response = await POST(request)

    expect(response.status).toBe(201)
    expect(createCategoriesMock).toHaveBeenCalledWith({
      data: expect.arrayContaining([
        expect.objectContaining({ name: "Dairy" }),
      ]),
    })
  })

  it("sets FAILED when OCR returns no items", async () => {
    uploadMock.mockResolvedValue({ error: null })
    downloadMock.mockResolvedValue({
      data: new Blob([new Uint8Array([1, 2, 3])], { type: "image/jpeg" }),
      error: null,
    })
    createReceiptMock.mockResolvedValue({ id: "receipt-123" })
    extractReceiptDraftItemsMock.mockResolvedValue({
      items: [],
      fallbackUsed: false,
    })
    updateReceiptMock.mockResolvedValue({ id: "receipt-123", ocrStatus: "FAILED" })

    const formData = new FormData()
    formData.append(
      "receipt",
      new File(["data"], "receipt.jpg", { type: "image/jpeg" })
    )

    const request = new Request("http://localhost/api/receipts", {
      method: "POST",
      body: formData as FormData,
    })

    const response = await POST(request)

    expect(response.status).toBe(201)
    const body = await response.json()
    expect(body.ocrStatus).toBe("FAILED")
    expect(createDraftItemsMock).not.toHaveBeenCalled()
  })

  it("sets FAILED when uploaded object cannot be downloaded for OCR", async () => {
    uploadMock.mockResolvedValue({ error: null })
    downloadMock.mockResolvedValue({ data: null, error: new Error("download failed") })
    createReceiptMock.mockResolvedValue({ id: "receipt-123" })
    updateReceiptMock.mockResolvedValue({ id: "receipt-123", ocrStatus: "FAILED" })

    const formData = new FormData()
    formData.append(
      "receipt",
      new File(["data"], "receipt.jpg", { type: "image/jpeg" })
    )

    const request = new Request("http://localhost/api/receipts", {
      method: "POST",
      body: formData as FormData,
    })

    const response = await POST(request)

    expect(response.status).toBe(201)
    const body = await response.json()
    expect(body.ocrStatus).toBe("FAILED")
    expect(extractReceiptDraftItemsMock).not.toHaveBeenCalled()
  })

  it("handles storage upload failure", async () => {
    uploadMock.mockResolvedValue({ error: new Error("upload failed") })

    const formData = new FormData()
    formData.append(
      "receipt",
      new File(["data"], "receipt.jpg", { type: "image/jpeg" })
    )

    const request = new Request("http://localhost/api/receipts", {
      method: "POST",
      body: formData as FormData,
    })

    const response = await POST(request)

    expect(response.status).toBe(500)
    const body = await response.json()
    expect(body.error).toMatch(/Failed to store receipt image/i)
    expect(createReceiptMock).not.toHaveBeenCalled()
  })

  it("cleans up uploaded file when DB creation fails", async () => {
    uploadMock.mockResolvedValue({ error: null })
    createReceiptMock.mockRejectedValue(new Error("db error"))
    removeMock.mockResolvedValue({ error: null })

    const formData = new FormData()
    formData.append(
      "receipt",
      new File(["data"], "receipt.jpg", { type: "image/jpeg" })
    )

    const request = new Request("http://localhost/api/receipts", {
      method: "POST",
      body: formData as FormData,
    })

    const response = await POST(request)

    expect(response.status).toBe(500)
    const body = await response.json()
    expect(body.error).toMatch(/Failed to process receipt upload/i)

    expect(uploadMock).toHaveBeenCalledTimes(1)
    expect(createReceiptMock).toHaveBeenCalledTimes(1)
    expect(removeMock).toHaveBeenCalledTimes(1)

    const removeArgs = removeMock.mock.calls[0]?.[0] as string[]
    expect(Array.isArray(removeArgs)).toBe(true)
    expect(removeArgs[0]).toEqual(expect.any(String))
  })
})
