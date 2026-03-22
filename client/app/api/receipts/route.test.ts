import { describe, it, expect, vi, beforeEach } from "vitest"

vi.mock("@/lib/supabase/server", () => {
  const uploadMock = vi.fn()
  const removeMock = vi.fn()

  return {
    supabaseAdmin: {
      storage: {
        from: vi.fn(() => ({
          upload: uploadMock,
          remove: removeMock,
        })),
      },
    },
    uploadMock,
    removeMock,
  }
})

vi.mock("@/lib/prisma", () => {
  const createReceiptMock = vi.fn()

  return {
    prisma: {
      receipt: {
        create: createReceiptMock,
      },
    },
    createReceiptMock,
  }
})

// Import after mocks so that the route uses the mocked dependencies
import { POST } from "./route"
// @ts-expect-error - test-only mocked exports
import { uploadMock, removeMock } from "@/lib/supabase/server"
// @ts-expect-error - test-only mocked exports
import { createReceiptMock } from "@/lib/prisma"

describe("POST /api/receipts route", () => {
  beforeEach(() => {
    uploadMock.mockReset()
    removeMock.mockReset()
    createReceiptMock.mockReset()
  })

  it("returns 400 when no file is uploaded", async () => {
    const formData = new FormData()

    const request = new Request("http://localhost/api/receipts", {
      method: "POST",
      body: formData as any,
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
      body: formData as any,
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
      body: formData as any,
    })

    const response = await POST(request)

    expect(response.status).toBe(400)
    const body = await response.json()
    expect(body.error).toMatch(/File is too large/i)
  })

  it("returns success JSON with receiptId for a valid upload", async () => {
    uploadMock.mockResolvedValue({ error: null })
    createReceiptMock.mockResolvedValue({
      id: "receipt-123",
      ocrStatus: "PENDING",
    })

    const formData = new FormData()
    formData.append(
      "receipt",
      new File(["data"], "receipt.jpg", { type: "image/jpeg" })
    )

    const request = new Request("http://localhost/api/receipts", {
      method: "POST",
      body: formData as any,
    })

    const response = await POST(request)

    expect(response.status).toBe(201)
    const body = await response.json()
    expect(body.receiptId).toBe("receipt-123")
    expect(body.ocrStatus).toBe("PENDING")
    expect(uploadMock).toHaveBeenCalledTimes(1)
    expect(createReceiptMock).toHaveBeenCalledTimes(1)
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
      body: formData as any,
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
      body: formData as any,
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
