import "server-only"

import { Worker } from "node:worker_threads"
import { withinDeadline } from "@/lib/ocr-worker"

/** Detect the container from bytes, including HEIF with a generic major brand. */
export function isHeifImage(bytes: Uint8Array): boolean {
  if (bytes.length < 16) return false
  const buffer = Buffer.from(bytes.buffer, bytes.byteOffset, bytes.byteLength)
  if (buffer.toString("ascii", 4, 8) !== "ftyp") return false
  const end = Math.min(buffer.readUInt32BE(0), bytes.length, 256)
  const brands: string[] = [buffer.toString("ascii", 8, 12)]
  for (let offset = 16; offset + 4 <= end; offset += 4) {
    brands.push(buffer.toString("ascii", offset, offset + 4))
  }
  if (brands.some(brand => brand === "avif" || brand === "avis")) return false
  return brands.some(brand => /^(heic|heix|hevc|hevx|heim|heis|hevm|hevs|mif1|msf1)$/.test(brand))
}

/** Decode in a separate thread: synchronous HEVC/WASM can be forcibly stopped. */
export async function convertHeifImage(
  bytes: Uint8Array,
  workerPath: string,
  timeoutMs: number,
  cleanupMs: number,
): Promise<Uint8Array> {
  const thread = new Worker(workerPath, { stdout: true, stderr: true })
  thread.stdout?.resume()
  thread.stderr?.resume()
  try {
    return await withinDeadline(new Promise<Uint8Array>((resolve, reject) => {
      const fail = () => reject(new Error("RECEIPT_IMAGE_DECODE_FAILED"))
      thread.once("error", fail)
      thread.once("exit", fail)
      thread.once("message", (packet: { image?: Uint8Array }) => {
        if (packet.image instanceof Uint8Array && packet.image.length > 0) resolve(packet.image)
        else fail()
      })
      thread.postMessage(bytes)
    }), timeoutMs)
  } finally {
    await withinDeadline(thread.terminate(), cleanupMs)
  }
}
