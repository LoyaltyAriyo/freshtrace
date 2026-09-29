/* @vitest-environment jsdom */

import { describe, it, expect, vi, beforeEach, afterEach } from "vitest"
import { render, screen, fireEvent, waitFor } from "@testing-library/react"

import { ReceiptUploadForm } from "../receipt-upload-form"

const pushMock = vi.fn()

vi.mock("next/navigation", () => ({
  useRouter: () => ({
    push: pushMock,
  }),
}))

describe("ReceiptUploadForm", () => {
  beforeEach(() => {
    pushMock.mockClear()
  })

  afterEach(() => {
    vi.restoreAllMocks()
    vi.unstubAllGlobals()
  })

  it("shows an error for non-image files", async () => {
    render(<ReceiptUploadForm />)

    const input = screen.getByLabelText("Upload receipt image") as HTMLInputElement

    const file = new File(["hello"], "test.txt", { type: "text/plain" })

    await fireEvent.change(input, { target: { files: [file] } })

    expect(
      await screen.findByText(
        "Invalid file type. Please upload a JPG, PNG, HEIC, HEIF, or WebP image."
      )
    ).toBeInTheDocument()
  })

  it("shows an error for files larger than 4 MiB", async () => {
    const fetchMock = vi.fn()
    vi.stubGlobal("fetch", fetchMock)
    render(<ReceiptUploadForm />)

    const input = screen.getByLabelText("Upload receipt image") as HTMLInputElement

    const bigFile = new File(
      [new Uint8Array(4 * 1024 * 1024 + 1)],
      "big.jpg",
      { type: "image/jpeg" }
    )

    await fireEvent.change(input, { target: { files: [bigFile] } })

    expect(
      await screen.findByText("File is too large. Maximum size is 4 MiB. Please choose a smaller image.")
    ).toBeInTheDocument()
    expect(fetchMock).not.toHaveBeenCalled()
  })

  it("explains a platform 413 even when the response is not JSON", async () => {
    const json = vi.fn().mockRejectedValue(new Error("Not JSON"))
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue({ ok: false, status: 413, json }))
    render(<ReceiptUploadForm />)
    fireEvent.change(screen.getByLabelText("Upload receipt image"), { target: { files: [new File(["data"], "receipt.webp", { type: "image/webp" })] } })
    expect(await screen.findByText("File is too large. Maximum size is 4 MiB. Please choose a smaller image.")).toBeInTheDocument()
    expect(json).not.toHaveBeenCalled()
    expect(pushMock).not.toHaveBeenCalled()
  })

  it("submits a valid image file, calls /api/receipts, and navigates on success", async () => {
    const fetchMock = vi.fn().mockResolvedValue({
      ok: true,
      json: vi.fn().mockResolvedValue({ receiptId: "receipt-123" }),
    })

    vi.stubGlobal("fetch", fetchMock)

    render(<ReceiptUploadForm />)

    const input = screen.getByLabelText("Upload receipt image") as HTMLInputElement
    const file = new File(["data"], "receipt.jpg", { type: "image/jpeg" })

    await fireEvent.change(input, { target: { files: [file] } })

    await waitFor(() => {
      expect(fetchMock).toHaveBeenCalledTimes(1)
    })

    const [url, options] = (fetchMock.mock.calls[0] ?? []) as [
      string,
      RequestInit,
    ]

    expect(url).toBe("/api/receipts")
    expect(options.method).toBe("POST")
    expect(options.body).toBeInstanceOf(FormData)

    const body = options.body as FormData
    const sentFile = body.get("receipt") as File | null

    expect(sentFile).not.toBeNull()
    expect(sentFile?.name).toBe("receipt.jpg")

    await waitFor(() => {
      expect(pushMock).toHaveBeenCalledWith(
        "/scan/review?receiptId=receipt-123"
      )
    })
  })

  it("shows backend error message when upload fails", async () => {
    const fetchMock = vi.fn().mockResolvedValue({
      ok: false,
      json: vi.fn().mockResolvedValue({ error: "Backend failure" }),
    })

    vi.stubGlobal("fetch", fetchMock)

    render(<ReceiptUploadForm />)

    const input = screen.getByLabelText("Upload receipt image") as HTMLInputElement
    const file = new File(["data"], "receipt.jpg", { type: "image/jpeg" })

    await fireEvent.change(input, { target: { files: [file] } })

    expect(
      await screen.findByText("Backend failure")
    ).toBeInTheDocument()
  })
})
