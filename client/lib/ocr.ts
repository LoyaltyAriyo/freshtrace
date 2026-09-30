import "server-only"

import fs from "node:fs"
import path from "node:path"
import { fileURLToPath } from "node:url"

import { createOcrWorker, OcrTimeoutError, withinDeadline } from "@/lib/ocr-worker"
import { convertHeifImage, isHeifImage } from "@/lib/receipt-image"

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
	| "IMAGE_PREPARATION"
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
	imageWorkerPath?: string
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
			...getAncestorDirectories(cwd),
			...getAncestorDirectories(moduleDirectory),
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
		imageWorkerPath: firstExistingFile(roots.flatMap(root => [
			path.join(root, "lib/receipt-image-worker.cjs"),
			path.join(root, "client/lib/receipt-image-worker.cjs"),
		]), fileExists) ?? undefined,
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

export async function extractReceiptDraftItems(
	imageBytes: Uint8Array,
	{ deadline = Date.now() + 60_000, initializationMs = 15_000, recognitionMs = 40_000, cleanupMs = 2_000, onStage }: {
		deadline?: number
		initializationMs?: number
		recognitionMs?: number
		cleanupMs?: number
		onStage?: (stage: OcrFailureStage) => void
	} = {},
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

	let worker: ReturnType<typeof createOcrWorker> | undefined
	let outcome: OcrExtractionResult | undefined
	let stage: OcrFailureStage = "INITIALIZATION"

	try {
		if (isHeifImage(imageBytes)) {
			stage = "IMAGE_PREPARATION"
			onStage?.(stage)
			if (!runtimeAssets.imageWorkerPath) return failedOutcome(stage, "OCR_IMAGE_DECODER_MISSING")
			imageBytes = await convertHeifImage(imageBytes, runtimeAssets.imageWorkerPath,
				Math.min(15_000, deadline - Date.now() - cleanupMs), cleanupMs)
		}
		stage = "INITIALIZATION"
		onStage?.(stage)
		worker = createOcrWorker(runtimeAssets.workerPath, runtimeAssets.langPath)
		await withinDeadline(worker.initialize(), Math.min(initializationMs, deadline - Date.now() - cleanupMs))

		stage = "RECOGNITION"
		onStage?.(stage)
		const result = await withinDeadline(worker.recognize(imageBytes), Math.min(recognitionMs, deadline - Date.now() - cleanupMs))

		stage = "PARSING"
		onStage?.(stage)
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
	} catch (error) {
		const category =
			stage === "IMAGE_PREPARATION"
				? "OCR_IMAGE_DECODE_FAILED"
				: stage === "INITIALIZATION"
				? "OCR_WORKER_INITIALIZATION_FAILED"
				: stage === "RECOGNITION"
					? "OCR_RECOGNITION_FAILED"
					: "OCR_PARSING_FAILED"
		outcome = failedOutcome(stage, error instanceof OcrTimeoutError ? `OCR_${stage}_TIMEOUT` : category)
	} finally {
		if (worker) {
			try {
				onStage?.("TERMINATION")
				await withinDeadline(worker.terminate(), cleanupMs)
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
