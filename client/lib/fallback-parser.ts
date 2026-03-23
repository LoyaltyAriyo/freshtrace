export type ParsedReceiptItem = {
	name: string
	quantity: number
}

export const NOISE_PATTERNS = [
	/\bsubtotal\b/i,
	/\btotal\b/i,
	/\btax\b/i,
	/\bchange\b/i,
	/\bcash\b/i,
	/\bdebit\b/i,
	/\bcredit\b/i,
	/\bvisa\b/i,
	/\bmastercard\b/i,
	/\bthank\s*you\b/i,
	/\breceipt\b/i,
	/\bstore\b/i,
	/\bsuper\s*store\b/i,
	/\bmanager\b/i,
	/\baccount\b/i,
	/\bapproval\b/i,
	/\bterminal\b/i,
	/\bitems?\s+sold\b/i,
	/\bcustomer\s+copy\b/i,
	/\bdate\b/i,
	/\b(mon|tue|wed|thu|fri|sat|sun)\b/i,
]

function cleanupLine(rawLine: string): string {
	return rawLine
		.replace(/\s+/g, " ")
		.replace(/\s+\$?\d+[.,]\d{2}\s*$/g, "")
		.trim()
}

function isLikelyNoise(line: string): boolean {
	if (!line) return true
	if (!/[a-z]/i.test(line)) return true
	if (line.length < 2) return true
	// Lines that are mostly weight/price metadata like "0.442kg NET @ $2.99/kg"
	if (/^\d+(\.\d+)?\s*kg\b/i.test(line)) return true
	if (/\bkg\b.*\$\d+[.,]\d{2}/i.test(line)) return true
	return NOISE_PATTERNS.some((pattern) => pattern.test(line))
}

function parseLine(line: string): ParsedReceiptItem | null {
	// Examples supported:
	// "2 Milk", "2x Milk", "Milk x2", "Milk"
	const startQty = line.match(/^(\d{1,3})\s*x?\s+(.+)$/i)
	if (startQty) {
		return {
			quantity: Math.max(1, Number(startQty[1])),
			name: startQty[2].trim(),
		}
	}

	const endQty = line.match(/^(.+?)\s+x\s*(\d{1,3})$/i)
	if (endQty) {
		return {
			quantity: Math.max(1, Number(endQty[2])),
			name: endQty[1].trim(),
		}
	}

	return {
		quantity: 1,
		name: line,
	}
}

export function parseFallbackReceiptItems(rawText: string): ParsedReceiptItem[] {
	if (!rawText || !rawText.trim()) return []

	const uniqueByName = new Map<string, ParsedReceiptItem>()

	for (const rawLine of rawText.split(/\r?\n/)) {
		const line = cleanupLine(rawLine)
		if (isLikelyNoise(line)) continue

		const parsed = parseLine(line)
		if (!parsed) continue

		const name = parsed.name.replace(/[^a-z0-9\s\-()]/gi, "").trim()
		if (!name || name.length < 2) continue

		const key = name.toLowerCase()
		if (!uniqueByName.has(key)) {
			uniqueByName.set(key, {
				name,
				quantity: parsed.quantity,
			})
		}
	}

	return Array.from(uniqueByName.values()).slice(0, 20)
}
