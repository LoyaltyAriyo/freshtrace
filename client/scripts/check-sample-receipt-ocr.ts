// Local, offline check: uses the actual extractor and native Tesseract worker.
// No database, storage, server, or credentials are involved.
// Run from client/: node --conditions=react-server --import tsx scripts/check-sample-receipt-ocr.ts
import assert from "node:assert/strict"
import fs from "node:fs"
import { extractReceiptDraftItems } from "../lib/ocr"
import { MAX_RECEIPT_FILE_BYTES } from "../lib/receipt-upload"

async function main() {
  process.env.TESSERACT_ENABLED = "true"
  const image = fs.readFileSync("public/samples/grocery-receipt.png")
  assert.ok(image.byteLength <= MAX_RECEIPT_FILE_BYTES)
  assert.equal(image.subarray(1, 4).toString(), "PNG")
  const started = Date.now()
  const result = await extractReceiptDraftItems(image)
  console.log(JSON.stringify({ ...result, bytes: image.byteLength, elapsedMs: Date.now() - started }, null, 2))
  assert.equal(result.status, "SUCCESS")
  for (const name of [/zuch/i, /banana/i, /potato/i, /broccoli/i, /sprouts/i, /grapes/i, /peas/i, /tomatoes/i, /lettuce/i]) {
    assert.ok(result.items.some(item => name.test(item.name)), `Expected grocery: ${name}`)
  }
  assert.equal(result.items.length, 9, "Only the nine grocery lines should be extracted")
  assert.ok(result.items.every(item => !/subtotal|total|cash|change|loyalty|special|date|\bnet\b/i.test(item.name)))
  console.log("Real sample OCR passed: nine groceries; date, prices, offers, weights and totals excluded.")
}

main().catch(error => { console.error(error); process.exitCode = 1 })
