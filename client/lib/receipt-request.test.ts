/* @vitest-environment jsdom */
import { afterEach, describe, expect, it, vi } from "vitest"
import { receiptRequest, RECEIPT_UNCERTAIN_ERROR } from "./receipt-request"

afterEach(() => vi.unstubAllGlobals())
describe("receipt request deadline", () => {
  it.each(["headers", "body"])("aborts stalled %s and ignores late completion", async stage => {
    const controller = new AbortController()
    const never = new Promise(() => {})
    vi.stubGlobal("fetch", vi.fn().mockReturnValue(stage === "headers" ? never : Promise.resolve({ ok: true, json: () => never })))
    await expect(receiptRequest("/api/receipts", {}, controller, 10)).rejects.toThrow(RECEIPT_UNCERTAIN_ERROR)
    expect(controller.signal.aborted).toBe(true)
  })

  it("handles platform HTML errors without blaming the image", async () => {
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue({ ok: false, status: 504, json: () => Promise.reject(new SyntaxError()) }))
    await expect(receiptRequest("/api/receipts", {}, new AbortController())).rejects.toThrow(RECEIPT_UNCERTAIN_ERROR)
  })

  it("preserves a saved receipt ID on a processing error", async () => {
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue({ ok: false, status: 500, json: () => Promise.resolve({ receiptId: "saved", ocrStatus: "FAILED" }) }))
    await expect(receiptRequest("/api/receipts", {}, new AbortController())).resolves.toMatchObject({ receiptId: "saved" })
  })
})
