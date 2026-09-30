// Local-only production check. Never starts a server or writes to Supabase/Prisma.
// A temporary GET probe exercises the compiled extractor; finally restores the
// source and rebuilds so the probe is absent from both source and final output.
import fs from "node:fs"
import os from "node:os"
import path from "node:path"
import { execFileSync } from "node:child_process"
import { fileURLToPath } from "node:url"
import sharp from "sharp"

const client = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..")
const repo = path.dirname(client)
const source = path.join(client, "app/api/receipts/route.ts")
const original = fs.readFileSync(source, "utf8")
const build = () => execFileSync(process.execPath, ["node_modules/next/dist/bin/next", "build", "--webpack"], { cwd: client, stdio: "inherit" })
if (process.versions.node.split(".")[0] !== "22") throw new Error("Use the supported Node 22 runtime")
const fixture = fs.mkdtempSync(path.join(os.tmpdir(), "freshtrace-production-ocr-"))
// Optional private photo stays local, outside the repository, and is never logged.
const privateSample = process.env.FRESHTRACE_PRIVATE_OCR_SAMPLE

try {
  if (privateSample) fs.copyFileSync(privateSample, path.join(fixture, "private-sample"))
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="1000" height="600"><rect width="100%" height="100%" fill="white"/><g fill="black" font-family="Arial" font-size="44"><text x="70" y="90">SAMPLE GROCERY</text><text x="70" y="180">2 Milk $3.99</text><text x="70" y="250">Bread $2.50</text><text x="70" y="320">Apples $4.00</text><text x="70" y="440">TOTAL $10.49</text></g></svg>`
  for (const format of ["png", "jpeg", "webp"]) {
    await sharp(Buffer.from(svg)).toFormat(format).toFile(path.join(fixture, `sample.${format}`))
  }
  fs.writeFileSync(source, original + `
export async function GET() {
  const fs = await import("node:fs");
  const { resolveOcrRuntimeAssets } = await import("@/lib/ocr");
  return Response.json({ assets: resolveOcrRuntimeAssets(), extraction: await extractReceiptDraftItems(fs.readFileSync(process.env.FRESHTRACE_OCR_SAMPLE_PATH!)) });
}
`)
  build()
  fs.writeFileSync(source, original)
  const route = path.join(client, ".next/server/app/api/receipts/route.js")
  const files = [route, ...JSON.parse(fs.readFileSync(route + ".nft.json", "utf8")).files.map(file => path.resolve(path.dirname(route), file))]
  for (const file of files) {
    const relative = path.relative(repo, file)
    if (relative.startsWith("..") || path.basename(file).startsWith(".env")) throw new Error("Unexpected trace path")
    const target = path.join(fixture, relative)
    fs.mkdirSync(path.dirname(target), { recursive: true })
    fs.copyFileSync(file, target)
    fs.chmodSync(target, 0o444)
  }
  const offline = path.join(fixture, "offline.cjs")
  fs.writeFileSync(offline, "global.fetch = async () => { throw new Error('Runtime downloads forbidden in OCR check') };\n")
  // Node workers inherit --require: reject runtime downloads in the thread too.
  execFileSync(process.execPath, ["--require", offline, "--input-type=commonjs", "-e", `
    const assert = require('node:assert/strict');
    const path = require('node:path');
    const route = require(path.resolve('.next/server/app/api/receipts/route.js'));
    (async () => {
      for (const format of ['png', 'jpeg', 'webp']) {
        process.env.FRESHTRACE_OCR_SAMPLE_PATH = path.resolve('..', 'sample.' + format);
        const start = Date.now();
        const response = await route.routeModule.userland.GET();
        const { assets, extraction } = await response.json();
        assert.ok(assets.workerPath.startsWith(process.cwd()), 'Worker must resolve inside isolated trace');
        assert.ok(assets.langPath.startsWith(process.cwd()), 'Language data must resolve inside isolated trace');
        assert.equal(extraction.status, 'SUCCESS');
        for (const name of ['Milk', 'Bread', 'Apples']) assert.ok(extraction.items.some(item => item.name === name));
        assert.equal(extraction.items.find(item => item.name === 'Milk').quantity, 2);
        console.log(JSON.stringify({ check: 'REAL_PRODUCTION_OCR', node: process.version, format, status: extraction.status, expectedItemsFound: true, elapsedMs: Date.now() - start }));
      }
      if (process.env.FRESHTRACE_PRIVATE_OCR_SAMPLE) {
        process.env.FRESHTRACE_OCR_SAMPLE_PATH = path.resolve('..', 'private-sample');
        const start = Date.now();
        const { assets, extraction } = await (await route.routeModule.userland.GET()).json();
        assert.ok(assets.imageWorkerPath.startsWith(process.cwd()), 'HEIC decoder must resolve inside isolated trace');
        assert.equal(extraction.status, 'SUCCESS');
        assert.ok(extraction.items.length > 0);
        console.log(JSON.stringify({ check: 'PRIVATE_PHOTO_PRODUCTION_OCR', status: extraction.status, itemCount: extraction.items.length, elapsedMs: Date.now() - start }));
      }
    })().catch(() => { console.error('Isolated production OCR check failed'); process.exitCode = 1 });
  `], {
    cwd: path.join(fixture, "client"),
    timeout: 150_000,
    stdio: "inherit",
    env: {
      ...process.env, NODE_ENV: "production", TESSERACT_ENABLED: "true", VERCEL: "1",
      DATABASE_URL: "postgresql://sample:sample@127.0.0.1:1/sample",
      SUPABASE_URL: "https://example.supabase.co", NEXT_PUBLIC_SUPABASE_URL: "https://example.supabase.co",
      SUPABASE_SERVICE_ROLE_KEY: "sample", NEXT_PUBLIC_SUPABASE_ANON_KEY: "sample",
    },
  })
} finally {
  fs.writeFileSync(source, original)
  fs.rmSync(fixture, { recursive: true, force: true })
  build()
}
