/* @vitest-environment node */
import fs from "node:fs"
import os from "node:os"
import path from "node:path"
import { afterEach, describe, expect, it, vi } from "vitest"

vi.mock("server-only", () => ({}))
import { createOcrWorker, OcrTimeoutError, withinDeadline } from "./ocr-worker"

const directories: string[] = []
function fixture(code: string) {
  const directory = fs.mkdtempSync(path.join(os.tmpdir(), "receipt-worker-"))
  directories.push(directory)
  const file = path.join(directory, "worker.cjs")
  fs.writeFileSync(file, code)
  return createOcrWorker(file, directory)
}
afterEach(() => directories.splice(0).forEach(dir => fs.rmSync(dir, { recursive: true, force: true })))

describe("native OCR worker lifecycle", () => {
  it("rejects initialization on the deployed missing-module failure and cleans up", async () => {
    const worker = fixture("require('./missing-imageType')")
    try {
      await expect(withinDeadline(worker.initialize(), 2_000)).rejects.toThrow("OCR_WORKER_FAILED")
    } finally {
      await expect(withinDeadline(worker.terminate(), 2_000)).resolves.toEqual(expect.any(Number))
    }
  })

  it.each(["initialization", "recognition"])("forcibly stops a real thread stuck in %s", async stage => {
    const worker = fixture(`
      const { parentPort } = require('node:worker_threads');
      parentPort.on('message', packet => {
        if (${JSON.stringify(stage)} === 'initialization' || packet.action === 'recognize') {
          while (true) {} // Simulate a stalled WASM call that cannot receive cancel messages.
        }
        parentPort.postMessage({ jobId: packet.jobId, status: 'resolve', data: {} });
      });
    `)
    try {
      if (stage === "recognition") await withinDeadline(worker.initialize(), 2_000)
      const work = stage === "initialization" ? worker.initialize() : worker.recognize(new Uint8Array([1]))
      await expect(withinDeadline<unknown>(work, 100)).rejects.toBeInstanceOf(OcrTimeoutError)
    } finally {
      const termination = worker.terminate()
      expect(worker.terminate()).toBe(termination)
      // Resolves only after native exit, proving the timed-out work has stopped.
      await expect(withinDeadline(termination, 2_000)).resolves.toEqual(expect.any(Number))
    }
  })
})
