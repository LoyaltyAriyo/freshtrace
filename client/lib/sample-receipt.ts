export const SAMPLE_RECEIPT_URL = "/samples/grocery-receipt.png"
export const SAMPLE_RECEIPT_LOAD_ERROR = "Could not load the sample receipt. Please try again."

/** Bound both the asset response and its body, before any receipt is created. */
export async function loadSampleReceipt(controller: AbortController): Promise<File> {
  let timer: ReturnType<typeof setTimeout> | undefined
  const onAbort = () => rejectLoad?.(new Error(SAMPLE_RECEIPT_LOAD_ERROR))
  let rejectLoad: ((error: Error) => void) | undefined
  try {
    return await Promise.race([
      (async () => {
        const response = await fetch(SAMPLE_RECEIPT_URL, { signal: controller.signal, redirect: "error" })
        if (!response.ok) throw new Error(SAMPLE_RECEIPT_LOAD_ERROR)
        const blob = await response.blob()
        // An expired session or missing asset must never upload an HTML page.
        if (blob.type !== "image/png" || blob.size === 0) throw new Error(SAMPLE_RECEIPT_LOAD_ERROR)
        return new File([blob], "grocery-receipt.png", { type: "image/png" })
      })(),
      new Promise<never>((_, reject) => {
        rejectLoad = reject
        controller.signal.addEventListener("abort", onAbort, { once: true })
        if (controller.signal.aborted) onAbort()
        timer = setTimeout(() => controller.abort(), 10_000)
      }),
    ])
  } catch {
    throw new Error(SAMPLE_RECEIPT_LOAD_ERROR)
  } finally {
    clearTimeout(timer)
    controller.signal.removeEventListener("abort", onAbort)
  }
}
