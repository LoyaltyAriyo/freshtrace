/* @vitest-environment node */

import fs from "node:fs"
import os from "node:os"
import path from "node:path"

import { afterEach, beforeEach, describe, expect, it, vi } from "vitest"

const tesseractMocks = vi.hoisted(() => ({
	createWorker: vi.fn(),
}))
const fallbackMocks = vi.hoisted(() => ({
	parse: vi.fn(),
}))

vi.mock("server-only", () => ({}))
vi.mock("tesseract.js", () => ({
	createWorker: tesseractMocks.createWorker,
}))
vi.mock("@/lib/fallback-parser", async (importOriginal) => {
	const original = await importOriginal<typeof import("@/lib/fallback-parser")>()
	return {
		...original,
		parseFallbackReceiptItems: fallbackMocks.parse,
	}
})

import {
	extractReceiptDraftItems,
	isOcrEnabled,
	resolveOcrRuntimeAssets,
} from "@/lib/ocr"

type MockWorkerOptions = {
	text?: string
	confidence?: number
	recognitionError?: Error
	terminationError?: Error
}

function makeWorker({
	text = "Milk",
	confidence = 90,
	recognitionError,
	terminationError,
}: MockWorkerOptions = {}) {
	const recognize = recognitionError
		? vi.fn().mockRejectedValue(recognitionError)
		: vi.fn().mockResolvedValue({ data: { text, confidence } })
	const terminate = terminationError
		? vi.fn().mockRejectedValue(terminationError)
		: vi.fn().mockResolvedValue(undefined)

	return { recognize, terminate }
}

describe("OCR runtime", () => {
	beforeEach(() => {
		vi.unstubAllEnvs()
		tesseractMocks.createWorker.mockReset()
		fallbackMocks.parse.mockReset().mockReturnValue([])
	})

	afterEach(() => {
		vi.unstubAllEnvs()
	})

	it("returns DISABLED when TESSERACT_ENABLED is missing without creating a worker", async () => {
		vi.stubEnv("TESSERACT_ENABLED", "")

		await expect(extractReceiptDraftItems(new Uint8Array([1]))).resolves.toMatchObject({
			status: "DISABLED",
			items: [],
		})
		expect(tesseractMocks.createWorker).not.toHaveBeenCalled()
	})

	it("returns DISABLED when TESSERACT_ENABLED is false", async () => {
		vi.stubEnv("TESSERACT_ENABLED", "false")

		await expect(extractReceiptDraftItems(new Uint8Array([1]))).resolves.toMatchObject({
			status: "DISABLED",
		})
		expect(tesseractMocks.createWorker).not.toHaveBeenCalled()
	})

	it("does not enable OCR from NEXT_PUBLIC_TESSERACT_ENABLED", async () => {
		vi.stubEnv("TESSERACT_ENABLED", "")
		vi.stubEnv("NEXT_PUBLIC_TESSERACT_ENABLED", "true")

		expect(isOcrEnabled()).toBe(false)
		await expect(extractReceiptDraftItems(new Uint8Array([1]))).resolves.toMatchObject({
			status: "DISABLED",
		})
		expect(tesseractMocks.createWorker).not.toHaveBeenCalled()
	})

	it("starts OCR and preserves successful recognition and parsing", async () => {
		vi.stubEnv("TESSERACT_ENABLED", "true")
		const worker = makeWorker({ text: "2 Milk $3.99\nBread", confidence: 88 })
		tesseractMocks.createWorker.mockResolvedValue(worker)

		const result = await extractReceiptDraftItems(new Uint8Array([1, 2, 3]))

		expect(result).toEqual({
			status: "SUCCESS",
			items: [
				{ name: "Milk", quantity: 2, confidence: 0.88 },
				{ name: "Bread", quantity: 1, confidence: 0.88 },
			],
			fallbackUsed: false,
		})
		expect(tesseractMocks.createWorker).toHaveBeenCalledOnce()
		expect(tesseractMocks.createWorker).toHaveBeenCalledWith(
			"eng",
			1,
			expect.objectContaining({
				cacheMethod: "none",
				gzip: false,
				langPath: expect.not.stringMatching(/^https?:/),
				workerPath: expect.stringContaining("worker-script/node/index.js"),
				errorHandler: expect.any(Function),
			}),
		)
		expect(worker.terminate).toHaveBeenCalledOnce()
	})

	it("returns NO_ITEMS after successful recognition with no usable items", async () => {
		vi.stubEnv("TESSERACT_ENABLED", "true")
		const worker = makeWorker({ text: "1234\n$$$" })
		tesseractMocks.createWorker.mockResolvedValue(worker)

		await expect(extractReceiptDraftItems(new Uint8Array([1]))).resolves.toEqual({
			status: "NO_ITEMS",
			items: [],
			fallbackUsed: false,
		})
		expect(worker.terminate).toHaveBeenCalledOnce()
	})

	it("returns FALLBACK_USED when the fallback parser finds items", async () => {
		vi.stubEnv("TESSERACT_ENABLED", "true")
		const worker = makeWorker({ text: "1234" })
		tesseractMocks.createWorker.mockResolvedValue(worker)
		fallbackMocks.parse.mockReturnValue([{ name: "Bread", quantity: 1 }])

		await expect(extractReceiptDraftItems(new Uint8Array([1]))).resolves.toEqual({
			status: "FALLBACK_USED",
			items: [{ name: "Bread", quantity: 1, confidence: null }],
			fallbackUsed: true,
		})
		expect(worker.terminate).toHaveBeenCalledOnce()
	})

	it("classifies worker initialization rejection", async () => {
		vi.stubEnv("TESSERACT_ENABLED", "true")
		tesseractMocks.createWorker.mockRejectedValue(new Error("initialization failed"))

		await expect(extractReceiptDraftItems(new Uint8Array([1]))).resolves.toMatchObject({
			status: "FAILED",
			failure: {
				stage: "INITIALIZATION",
				category: "OCR_WORKER_INITIALIZATION_FAILED",
			},
		})
	})

	it("captures asynchronous worker initialization errors through the supported handler", async () => {
		vi.stubEnv("TESSERACT_ENABLED", "true")
		tesseractMocks.createWorker.mockImplementation((
			_langs: string,
			_oem: number,
			options: { errorHandler: (error: unknown) => void },
		) => {
			queueMicrotask(() => options.errorHandler(new Error("worker job failed")))
			return new Promise(() => undefined)
		})

		await expect(extractReceiptDraftItems(new Uint8Array([1]))).resolves.toMatchObject({
			status: "FAILED",
			failure: {
				stage: "INITIALIZATION",
				category: "OCR_WORKER_INITIALIZATION_FAILED",
			},
		})
	})

	it("terminates and classifies a recognition rejection", async () => {
		vi.stubEnv("TESSERACT_ENABLED", "true")
		const worker = makeWorker({ recognitionError: new Error("recognition failed") })
		tesseractMocks.createWorker.mockResolvedValue(worker)

		await expect(extractReceiptDraftItems(new Uint8Array([1]))).resolves.toMatchObject({
			status: "FAILED",
			failure: {
				stage: "RECOGNITION",
				category: "OCR_RECOGNITION_FAILED",
			},
		})
		expect(worker.terminate).toHaveBeenCalledOnce()
	})

	it("terminates and classifies a parsing failure", async () => {
		vi.stubEnv("TESSERACT_ENABLED", "true")
		const worker = makeWorker({ text: "1234" })
		tesseractMocks.createWorker.mockResolvedValue(worker)
		fallbackMocks.parse.mockImplementation(() => {
			throw new Error("parser failed")
		})

		await expect(extractReceiptDraftItems(new Uint8Array([1]))).resolves.toMatchObject({
			status: "FAILED",
			failure: {
				stage: "PARSING",
				category: "OCR_PARSING_FAILED",
			},
		})
		expect(worker.terminate).toHaveBeenCalledOnce()
	})

	it("reports termination failure after otherwise successful OCR", async () => {
		vi.stubEnv("TESSERACT_ENABLED", "true")
		const worker = makeWorker({ terminationError: new Error("terminate failed") })
		tesseractMocks.createWorker.mockResolvedValue(worker)

		await expect(extractReceiptDraftItems(new Uint8Array([1]))).resolves.toMatchObject({
			status: "FAILED",
			failure: {
				stage: "TERMINATION",
				category: "OCR_WORKER_TERMINATION_FAILED",
			},
		})
	})

	it("does not mask recognition failure when termination also fails", async () => {
		vi.stubEnv("TESSERACT_ENABLED", "true")
		const worker = makeWorker({
			recognitionError: new Error("recognition failed"),
			terminationError: new Error("terminate failed"),
		})
		tesseractMocks.createWorker.mockResolvedValue(worker)

		await expect(extractReceiptDraftItems(new Uint8Array([1]))).resolves.toMatchObject({
			status: "FAILED",
			failure: {
				stage: "RECOGNITION",
				category: "OCR_RECOGNITION_FAILED",
				terminationFailed: true,
			},
		})
	})
})

describe("OCR runtime asset resolution", () => {
	const clientRoot = path.resolve(import.meta.dirname, "..")
	const repositoryRoot = path.resolve(clientRoot, "..")

	it("resolves tracked assets when launched from client", () => {
		const assets = resolveOcrRuntimeAssets({
			cwd: clientRoot,
			moduleDirectory: path.join(clientRoot, "lib"),
		})

		expect(assets?.langPath).toBe(clientRoot)
		expect(assets?.workerPath).toBe(
			path.join(clientRoot, "node_modules/tesseract.js/src/worker-script/node/index.js"),
		)
	})

	it("resolves tracked assets when launched from the repository root", () => {
		const assets = resolveOcrRuntimeAssets({
			cwd: repositoryRoot,
			moduleDirectory: path.join(repositoryRoot, "unrelated"),
		})

		expect(assets?.langPath).toBe(clientRoot)
		expect(assets?.workerPath).toContain("client/node_modules/tesseract.js")
	})

	it("resolves assets from an isolated production output layout", () => {
		const fixtureRoot = fs.mkdtempSync(path.join(os.tmpdir(), "freshtrace-ocr-"))
		const moduleDirectory = path.join(fixtureRoot, ".next/server/app/api/receipts")
		const workerPath = path.join(fixtureRoot, "node_modules/tesseract.js/src/worker-script/node/index.js")
		const langFile = path.join(fixtureRoot, "eng.traineddata")

		try {
			fs.mkdirSync(path.dirname(workerPath), { recursive: true })
			fs.mkdirSync(moduleDirectory, { recursive: true })
			fs.writeFileSync(workerPath, "")
			fs.writeFileSync(langFile, "")

			expect(resolveOcrRuntimeAssets({
				cwd: path.join(fixtureRoot, "launch-directory"),
				moduleDirectory,
			})).toEqual({
				langPath: fixtureRoot,
				workerPath,
			})
		} finally {
			fs.rmSync(fixtureRoot, { recursive: true, force: true })
		}
	})
})
