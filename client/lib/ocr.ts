import { parseFallbackReceiptItems } from "@/lib/fallback-parser"

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
	if (/\b(subtotal|total|tax|change|cash|visa|mastercard|receipt|thank\s*you)\b/i.test(cleanLine)) {
		return null
	}

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
	try {
		const tesseract = await import("tesseract.js")
		const result = await tesseract.recognize(imageBytes, "eng")

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

