/* @vitest-environment node */
import fs from "node:fs"
import os from "node:os"
import path from "node:path"
import { afterEach, describe, expect, it, vi } from "vitest"

vi.mock("server-only", () => ({}))
import { convertHeifImage, isHeifImage } from "./receipt-image"
import { OcrTimeoutError } from "./ocr-worker"

const directories: string[] = []
function fixture(code: string) {
  const directory = fs.mkdtempSync(path.join(os.tmpdir(), "receipt-image-"))
  directories.push(directory)
  const file = path.join(directory, "worker.cjs")
  fs.writeFileSync(file, code)
  return file
}
function container(major: string, compatible: string) {
  const bytes = Buffer.alloc(20)
  bytes.writeUInt32BE(20)
  bytes.write("ftyp", 4)
  bytes.write(major, 8)
  bytes.write(compatible, 16)
  return bytes
}
afterEach(() => directories.splice(0).forEach(dir => fs.rmSync(dir, { recursive: true, force: true })))

describe("receipt image preparation", () => {
  it("detects HEIC and generic HEIF containers without treating AVIF or JPEG as HEIC", () => {
    expect(isHeifImage(container("heic", "mif1"))).toBe(true)
    expect(isHeifImage(container("mif1", "heix"))).toBe(true)
    expect(isHeifImage(container("avif", "mif1"))).toBe(false)
    expect(isHeifImage(container("mif1", "avif"))).toBe(false)
    expect(isHeifImage(new Uint8Array([255, 216, 255]))).toBe(false)
  })

  it("returns converted bytes and stops its native thread", async () => {
    const worker = fixture(`const { parentPort } = require('node:worker_threads');
      parentPort.once('message', () => parentPort.postMessage({image: new Uint8Array([1,2,3])}));`)
    await expect(convertHeifImage(new Uint8Array([0]), worker, 2_000, 2_000))
      .resolves.toEqual(new Uint8Array([1, 2, 3]))
  })

  it("sanitizes decoder failures", async () => {
    const worker = fixture("throw new Error('private image details')")
    await expect(convertHeifImage(new Uint8Array([0]), worker, 2_000, 2_000))
      .rejects.toThrow("RECEIPT_IMAGE_DECODE_FAILED")
  })

  it("forcibly stops synchronous decoding after its deadline", async () => {
    const worker = fixture("while (true) {}")
    const start = Date.now()
    await expect(convertHeifImage(new Uint8Array([0]), worker, 100, 2_000))
      .rejects.toBeInstanceOf(OcrTimeoutError)
    expect(Date.now() - start).toBeLessThan(2_500)
  })
})
