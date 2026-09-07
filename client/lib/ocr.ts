import "server-only"

import { Buffer } from "node:buffer"
import fs from "node:fs"
import path from "node:path"
import { fileURLToPath } from "node:url"

import { NOISE_PATTERNS, parseFallbackReceiptItems } from "@/lib/fallback-parser"

const DEFAULT_LANG_FILE = "eng.traineddata"
const WORKER_RELATIVE_PATH = "node_modules/tesseract.js/src/worker-script/node/index.js"
const MODULE_DIRECTORY = path.dirname(fileURLToPath(import.meta.url))

export type OcrDraftItem = {
	name: string
	quantity: number
	confidence: number | null
}

export type OcrOutcomeStatus =
	| "DISABLED"
	| "SUCCESS"
	| "NO_ITEMS"
	| "FAILED"
	| "FALLBACK_USED"

export type OcrFailureStage =
	| "INITIALIZATION"
	| "RECOGNITION"
	| "PARSING"
	| "TERMINATION"

type OcrFailure = {
	stage: OcrFailureStage
	category: string
	terminationFailed?: boolean
}

export type OcrExtractionResult = {
	status: OcrOutcomeStatus
	items: OcrDraftItem[]
	fallbackUsed: boolean
	failure?: OcrFailure
}

type RuntimeAssetOptions = {
	cwd?: string
	moduleDirectory?: string
	fileExists?: (candidate: string) => boolean
}

export type OcrRuntimeAssets = {
	langPath: string
	workerPath: string
}

type OcrWorker = {
	recognize: (image: Buffer) => Promise<{
		data?: { text?: string; confidence?: number }
	}>
	terminate: () => Promise<unknown>
}

type TesseractModule = {
	createWorker: (
		langs: string,
		oem: number,
		options: Record<string, unknown>,
	) => Promise<OcrWorker>
}

function isFile(candidate: string): boolean {
	try {
		return fs.statSync(candidate).isFile()
	} catch {
		return false
	}
}

function getAncestorDirectories(start: string): string[] {
	const directories: string[] = []
	let current = path.resolve(start)

	for (let depth = 0; depth < 10; depth += 1) {
		directories.push(current)
		const parent = path.dirname(current)
		if (parent === current) break
		current = parent
	}

	return directories
}

function firstExistingFile(
	candidates: string[],
	fileExists: (candidate: string) => boolean,
): string | null {
	for (const candidate of candidates) {
		if (fileExists(candidate)) return candidate
	}
	return null
}

/** Resolve files from source and traced serverless layouts without relying only on cwd. */
export function resolveOcrRuntimeAssets({
	cwd = process.cwd(),
	moduleDirectory = MODULE_DIRECTORY,
	fileExists = isFile,
}: RuntimeAssetOptions = {}): OcrRuntimeAssets | null {
	const roots = Array.from(
		new Set([
			...getAncestorDirectories(moduleDirectory),
			...getAncestorDirectories(cwd),
		]),
	)

	const langFile = firstExistingFile(
		roots.flatMap((root) => [
			path.join(root, DEFAULT_LANG_FILE),
			path.join(root, "client", DEFAULT_LANG_FILE),
		]),
		fileExists,
	)
	const workerFile = firstExistingFile(
		roots.flatMap((root) => [
			path.join(root, WORKER_RELATIVE_PATH),
			path.join(root, "client", WORKER_RELATIVE_PATH),
		]),
		fileExists,
	)

	if (!langFile || !workerFile) return null

	return {
		langPath: path.dirname(langFile),
		workerPath: workerFile,
	}
}

export function isOcrEnabled(env: NodeJS.ProcessEnv = process.env): boolean {
	return env.TESSERACT_ENABLED === "true"
}

function parseLineToItem(line: string, confidence: number | null): OcrDraftItem | null {
	const cleanLine = line
		.replace(/\s+/g, " ")
		.replace(/\s+\$?\d+[.,]\d{2}\s*$/g, "")
		.trim()

	if (!cleanLine || !/[a-z]/i.test(cleanLine)) return null
	const tokens = cleanLine.split(/\s+/)
	const gibberishTokens = tokens.filter((token) =>
		/^([a-z])\1*$/i.test(token) || /^[a-z]{1,3}$/i.test(token),
	)
	if (tokens.length > 2 && gibberishTokens.length / tokens.length > 0.6) return null
	if (/^\d+(\.\d+)?\s*k[a-z]\b/i.test(cleanLine)) return null
	if (/\bk[a-z]\b.*\$\d+[.,]\d{2}/i.test(cleanLine)) return null
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
		if (!key || unique.has(key)) continue

		unique.set(key, {
			name: item.name,
			quantity: item.quantity,
			confidence: item.confidence,
		})
	}

	return Array.from(unique.values()).slice(0, 20)
}

function failedOutcome(
	stage: OcrFailureStage,
	category: string,
	terminationFailed = false,
): OcrExtractionResult {
	return {
		status: "FAILED",
		items: [],
		fallbackUsed: false,
		failure: {
			stage,
			category,
			...(terminationFailed ? { terminationFailed: true } : {}),
		},
	}
}

function createWorkerSafely(
	tesseract: TesseractModule,
	options: Record<string, unknown>,
): Promise<OcrWorker> {
	return new Promise((resolve, reject) => {
		let settled = false
		const rejectOnce = (error: unknown) => {
			if (settled) return
			settled = true
			reject(error)
		}

		const workerPromise = tesseract.createWorker("eng", 1, {
			...options,
			// Prevent Tesseract.js worker job errors from becoming uncaught throws.
			errorHandler: rejectOnce,
		})

		workerPromise.then(
			(worker) => {
				if (settled) {
					void worker.terminate().catch(() => undefined)
					return
				}
				settled = true
				resolve(worker)
			},
			rejectOnce,
		)
	})
}

export async function extractReceiptDraftItems(
	imageBytes: Uint8Array,
): Promise<OcrExtractionResult> {
	if (!isOcrEnabled()) {
		return {
			status: "DISABLED",
			items: [],
			fallbackUsed: false,
		}
	}

	const runtimeAssets = resolveOcrRuntimeAssets()
	if (!runtimeAssets) {
		return failedOutcome("INITIALIZATION", "OCR_RUNTIME_ASSET_MISSING")
	}

	let worker: OcrWorker | undefined
	let outcome: OcrExtractionResult | undefined
	let stage: OcrFailureStage = "INITIALIZATION"

	try {
		const tesseract = (await import("tesseract.js")) as unknown as TesseractModule
		worker = await createWorkerSafely(tesseract, {
			langPath: runtimeAssets.langPath,
			workerPath: runtimeAssets.workerPath,
			cachePath: process.env.VERCEL ? "/tmp" : runtimeAssets.langPath,
			cacheMethod: "none",
			gzip: false,
		})

		stage = "RECOGNITION"
		const result = await worker.recognize(Buffer.from(imageBytes))

		stage = "PARSING"
		const text = result?.data?.text ?? ""
		const confidenceRaw = result?.data?.confidence
		const confidence =
			typeof confidenceRaw === "number" && Number.isFinite(confidenceRaw)
				? Math.max(0, Math.min(1, confidenceRaw / 100))
				: null

		const ocrItems = dedupeItems(
			text
				.split(/\r?\n/)
				.map((line) => parseLineToItem(line, confidence))
				.filter((item): item is OcrDraftItem => item !== null),
		)

		if (ocrItems.length > 0) {
			outcome = {
				status: "SUCCESS",
				items: ocrItems,
				fallbackUsed: false,
			}
		} else {
			const fallbackItems = dedupeItems(
				parseFallbackReceiptItems(text).map((item) => ({
					name: item.name,
					quantity: item.quantity,
					confidence: null,
				})),
			)

			outcome = fallbackItems.length > 0
				? {
					status: "FALLBACK_USED",
					items: fallbackItems,
					fallbackUsed: true,
				}
				: {
					status: "NO_ITEMS",
					items: [],
					fallbackUsed: false,
				}
		}
	} catch {
		const category =
			stage === "INITIALIZATION"
				? "OCR_WORKER_INITIALIZATION_FAILED"
				: stage === "RECOGNITION"
					? "OCR_RECOGNITION_FAILED"
					: "OCR_PARSING_FAILED"
		outcome = failedOutcome(stage, category)
	} finally {
		if (worker) {
			try {
				await worker.terminate()
			} catch {
				if (outcome?.status === "FAILED" && outcome.failure) {
					outcome.failure.terminationFailed = true
				} else {
					outcome = failedOutcome("TERMINATION", "OCR_WORKER_TERMINATION_FAILED")
				}
			}
		}
	}

	return outcome ?? failedOutcome("INITIALIZATION", "OCR_UNKNOWN_FAILURE")
}
