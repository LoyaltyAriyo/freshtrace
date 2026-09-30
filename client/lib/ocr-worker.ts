import "server-only"

import { Worker } from "node:worker_threads"

export class OcrTimeoutError extends Error {}

export async function withinDeadline<T>(work: Promise<T>, timeoutMs: number): Promise<T> {
  let timer: ReturnType<typeof setTimeout> | undefined
  try {
    return await Promise.race([
      work,
      new Promise<never>((_, reject) => {
        timer = setTimeout(() => reject(new OcrTimeoutError()), Math.max(1, timeoutMs))
      }),
    ])
  } finally {
    clearTimeout(timer)
  }
}

/** Same Tesseract.js 7 Node worker and job protocol as createWorker.
 * Own the native thread BEFORE initialization: createWorker only exposes it
 * after initialization and doesn't listen to Node's error/exit events.
 * Keeping the handle lets us kill stalled WASM, including during startup.
 */
export function createOcrWorker(workerPath: string, langPath: string) {
  const thread = new Worker(workerPath, { stdout: true, stderr: true })
  // Native decoder output may contain receipt contents; never forward it to logs.
  thread.stdout?.resume()
  thread.stderr?.resume()
  const pending = new Map<string, {
    resolve: (data: unknown) => void
    reject: (error: Error) => void
  }>()
  let stopped = false
  let fatal: Error | undefined
  let termination: Promise<number> | undefined

  const fail = () => {
    // Do not surface arbitrary worker errors, paths or input content.
    fatal = new Error("OCR_WORKER_FAILED")
    for (const job of pending.values()) job.reject(fatal)
    pending.clear()
  }
  thread.on("error", fail)
  thread.on("exit", () => { if (!stopped) fail() })
  thread.on("message", (packet: { jobId: string; status: string; data: unknown }) => {
    const job = pending.get(packet.jobId)
    if (!job || packet.status === "progress") return
    pending.delete(packet.jobId)
    if (packet.status === "resolve") job.resolve(packet.data)
    else job.reject(new Error("OCR_JOB_FAILED"))
  })

  function job<T>(action: string, payload: Record<string, unknown>): Promise<T> {
    if (stopped || fatal) return Promise.reject(fatal ?? new Error("OCR_WORKER_STOPPED"))
    const jobId = crypto.randomUUID()
    return new Promise<T>((resolve, reject) => {
      pending.set(jobId, { resolve: (data) => resolve(data as T), reject })
      try {
        thread.postMessage({ workerId: "receipt", jobId, action, payload })
      } catch {
        pending.delete(jobId)
        reject(new Error("OCR_JOB_FAILED"))
      }
    })
  }

  return {
    async initialize() {
      await job("load", { options: { lstmOnly: true, logging: false } })
      await job("loadLanguage", {
        langs: "eng",
        options: { langPath, cacheMethod: "none", gzip: false, lstmOnly: true },
      })
      await job("initialize", { langs: "eng", oem: 1, config: {} })
    },
    async recognize(image: Uint8Array) {
      const data = await job<{ text?: string; confidence?: number }>("recognize", {
        image, options: {}, output: { text: true },
      })
      return { data }
    },
    terminate() {
      if (!termination) {
        stopped = true
        fail()
        // Node's terminate() forcibly stops JS/WASM and resolves on thread exit.
        // Tesseract's public terminate() discards this promise.
        termination = thread.terminate()
      }
      return termination
    },
  }
}
