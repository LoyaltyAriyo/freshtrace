import { RECEIPT_SIZE_ERROR } from "@/lib/receipt-upload"

export const RECEIPT_REQUEST_TIMEOUT_MS = 90_000
export const RECEIPT_UNCERTAIN_ERROR = "The upload could not be confirmed. Your receipt may already be saved. Check the saved receipt before uploading again."

export async function receiptRequest(
  url: string,
  options: RequestInit,
  controller: AbortController,
  timeoutMs = RECEIPT_REQUEST_TIMEOUT_MS,
): Promise<{ receiptId?: string; id?: string; ocrStatus?: string }> {
  let timer: ReturnType<typeof setTimeout> | undefined
  let onAbort: (() => void) | undefined
  try {
    return await Promise.race([
      (async () => {
        const response = await fetch(url, { ...options, signal: controller.signal })
        if (response.status === 413) throw new Error(RECEIPT_SIZE_ERROR)
        const data = await response.json().catch(() => null)
        if (data && typeof data.receiptId === "string") return data
        if (!response.ok) throw new Error(typeof data?.error === "string" ? data.error : RECEIPT_UNCERTAIN_ERROR)
        if (data && typeof data.id === "string") return data
        throw new Error(RECEIPT_UNCERTAIN_ERROR)
      })(),
      new Promise<never>((_, reject) => {
        onAbort = () => reject(new Error(RECEIPT_UNCERTAIN_ERROR))
        controller.signal.addEventListener("abort", onAbort, { once: true })
        if (controller.signal.aborted) onAbort()
        timer = setTimeout(() => controller.abort(), timeoutMs)
      }),
    ])
  } finally {
    clearTimeout(timer)
    if (onAbort) controller.signal.removeEventListener("abort", onAbort)
  }
}
