import { Buffer } from "node:buffer"
import fs from "node:fs"
import path from "node:path"
import { NOISE_PATTERNS, parseFallbackReceiptItems } from "@/lib/fallback-parser"

// Tesseract can be fragile in some local dev/runtime environments (for example,
// when worker scripts cannot be resolved correctly). To keep the app stable,
// OCR via tesseract.js is disabled by default and must be explicitly enabled
// with an environment variable:
//
//   NEXT_PUBLIC_TESSERACT_ENABLED=true  (or TESSERACT_ENABLED=true)
//
// When disabled, this module will safely return an empty result so the rest of
// the receipt flow can show a clear “OCR failed / no items found” state instead
// of crashing the server.
const TESSERACT_ENABLED =
	process.env.NEXT_PUBLIC_TESSERACT_ENABLED === "true" ||
	process.env.TESSERACT_ENABLED === "true"

const DEFAULT_LANG_FILE = "eng.traineddata"

function resolveLangPath() {
	const cwd = process.cwd()

	const candidates = [
		cwd,
		path.join(cwd, ".."),
	]

	for (const dir of candidates) {
		try {
			const candidateFile = path.join(dir, DEFAULT_LANG_FILE)
			if (fs.existsSync(candidateFile)) {
				return dir
			}
		} catch {
			// ignore and try next candidate
		}
	}

	return cwd
}

const TESSERACT_LANG_PATH = resolveLangPath()
const TESSERACT_CACHE_PATH = process.env.VERCEL ? "/tmp" : process.cwd()
let RESOLVED_WORKER_PATH: string | undefined
{
	// Resolve a real filesystem path for the tesseract worker script.
	const cwd = process.cwd()
	const candidates = [
		path.join(cwd, "node_modules/tesseract.js/src/worker-script/node/index.js"),
		path.join(cwd, "client/node_modules/tesseract.js/src/worker-script/node/index.js"),
	]

	for (const candidate of candidates) {
		try {
			if (fs.existsSync(candidate)) {
				RESOLVED_WORKER_PATH = candidate
				break
			}
		} catch {
			// ignore and try next
		}
	}
}

export type OcrDraftItem = {
	name: string
	quantity: number
	confidence: number | null
}

export type OcrExtractionResult = {
	items: OcrDraftItem[]
	fallbackUsed: boolean
}

function parseLineToItem(line: string, confidence: number | null): OcrDraftItem | null {
	const cleanLine = line
		.replace(/\s+/g, " ")
		.replace(/\s+\$?\d+[.,]\d{2}\s*$/g, "")
		.trim()

	if (!cleanLine || !/[a-z]/i.test(cleanLine)) return null
	// Treat lines that are clearly metadata (weights, dates, headers, etc.) as noise.
	if (/^\d+(\.\d+)?\s*kg\b/i.test(cleanLine)) return null
	if (/\bkg\b.*\$\d+[.,]\d{2}/i.test(cleanLine)) return null
	if (NOISE_PATTERNS.some((pattern) => pattern.test(cleanLine))) return null

	const startQty = cleanLine.match(/^(\d{1,3})\s*x?\s+(.+)$/i)
	if (startQty) {
		return {
			quantity: Math.max(1, Number(startQty[1])),
			name: startQty[2].trim(),
			confidence,
		}
	}

	const endQty = cleanLine.match(/^(.+?)\s+x\s*(\d{1,3})$/i)
	if (endQty) {
		return {
			quantity: Math.max(1, Number(endQty[2])),
			name: endQty[1].trim(),
			confidence,
		}
	}

	return {
		quantity: 1,
		name: cleanLine,
		confidence,
	}
}

function dedupeItems(items: OcrDraftItem[]): OcrDraftItem[] {
	const unique = new Map<string, OcrDraftItem>()

	for (const item of items) {
		const key = item.name.toLowerCase().trim()
		if (!key) continue

		if (!unique.has(key)) {
			unique.set(key, {
				name: item.name,
				quantity: item.quantity,
				confidence: item.confidence,
			})
		}
	}

	return Array.from(unique.values()).slice(0, 20)
}

export async function extractReceiptDraftItems(imageBytes: Uint8Array): Promise<OcrExtractionResult> {
	if (!TESSERACT_ENABLED) {
		return {
			items: [],
			fallbackUsed: false,
		}
	}

	try {
		const tesseract = await import("tesseract.js")
		// Tesseract typings expect an ImageLike (e.g. Buffer), so wrap the
		// Uint8Array from storage in a Node Buffer for type safety.
		const input = Buffer.from(imageBytes)
		const workerOptions: Record<string, unknown> = {
			langPath: TESSERACT_LANG_PATH,
			cachePath: TESSERACT_CACHE_PATH,
			gzip: false,
		}
		if (RESOLVED_WORKER_PATH) {
			workerOptions.workerPath = RESOLVED_WORKER_PATH
		}
		const worker = await tesseract.createWorker("eng", 1, workerOptions)
		const result = await worker.recognize(input)
		await worker.terminate()

		const text = result?.data?.text ?? ""
		const confidenceRaw = result?.data?.confidence
		const confidence =
			typeof confidenceRaw === "number" && Number.isFinite(confidenceRaw)
				? Math.max(0, Math.min(1, confidenceRaw / 100))
				: null

		const ocrParsed = text
			.split(/\r?\n/)
			.map((line) => parseLineToItem(line, confidence))
			.filter((item): item is OcrDraftItem => item !== null)

		const normalizedOcrItems = dedupeItems(ocrParsed)
		if (normalizedOcrItems.length > 0) {
			return {
				items: normalizedOcrItems,
				fallbackUsed: false,
			}
		}

		const fallbackItems = parseFallbackReceiptItems(text).map((item) => ({
			name: item.name,
			quantity: item.quantity,
			confidence: null,
		}))

		return {
			items: dedupeItems(fallbackItems),
			fallbackUsed: fallbackItems.length > 0,
		}
	} catch {
		return {
			items: [],
			fallbackUsed: false,
		}
	}
}
