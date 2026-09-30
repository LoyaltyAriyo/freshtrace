// Standalone CommonJS entry point loaded by worker_threads, outside Next bundling.
/* eslint-disable @typescript-eslint/no-require-imports */
const { parentPort } = require("node:worker_threads")
const convert = require("heic-convert")

parentPort.once("message", async (bytes) => {
  try {
    const image = await convert({ buffer: Buffer.from(bytes), format: "PNG" })
    parentPort.postMessage({ image: new Uint8Array(image) })
  } catch {
    parentPort.postMessage({ failed: true })
  }
})
