import { Buffer } from "node:buffer"
import { getCurrentUserId } from "@/lib/auth"
import { prisma } from "@/lib/prisma"
import { logError } from "@/lib/logger"
import type { HistoryStatus, ItemHistoryEntry, ItemHistoryResponse } from "@/lib/item-history"

export const runtime = "nodejs"

type Cursor = { v: 1; status: HistoryStatus; at: string; id: string }

function json(body: unknown, status = 200) {
  return Response.json(body, {
    status,
    headers: { "Cache-Control": "private, no-store", Vary: "Cookie" },
  })
}

function decodeCursor(value: string, status: HistoryStatus): Cursor | null {
  if (value.length > 512 || !/^[A-Za-z0-9_-]+$/.test(value)) return null
  try {
    const bytes = Buffer.from(value, "base64url")
    if (bytes.toString("base64url") !== value) return null
    const cursor: unknown = JSON.parse(bytes.toString("utf8"))
    if (!cursor || typeof cursor !== "object") return null
    const c = cursor as Record<string, unknown>
    if (
      c.v !== 1 || c.status !== status ||
      typeof c.id !== "string" || !/^[A-Za-z0-9_-]{1,128}$/.test(c.id) ||
      typeof c.at !== "string" || new Date(c.at).toISOString() !== c.at
    ) return null
    return { v: 1, status, at: c.at, id: c.id }
  } catch {
    return null
  }
}

const snapshotSelect = {
  id: true,
  foodItemId: true,
  name: true,
  quantity: true,
  categoryId: true,
  category: { select: { name: true } },
  // History has no dateAdded snapshot; this is the original source item's date.
  foodItem: { select: { dateAdded: true } },
} as const

export async function GET(request: Request) {
  try {
    const userId = await getCurrentUserId(request)
    if (!userId) return json({ error: "You must be signed in to view item history." }, 401)

    const params = new URL(request.url).searchParams
    const status = params.get("status")
    if (params.getAll("status").length !== 1 || (status !== "USED" && status !== "WASTED")) {
      return json({ error: "status must be USED or WASTED." }, 400)
    }
    const rawLimit = params.get("limit")
    if (params.getAll("limit").length > 1 ||
      (rawLimit !== null && (!/^[1-9]\d?$/.test(rawLimit) || Number(rawLimit) > 50))) {
      return json({ error: "limit must be an integer between 1 and 50." }, 400)
    }
    const limit = rawLimit === null ? 20 : Number(rawLimit)
    const rawCursor = params.get("cursor")
    const cursor = rawCursor === null ? null : decodeCursor(rawCursor, status)
    if (params.getAll("cursor").length > 1 || (rawCursor !== null && !cursor)) {
      return json({ error: "Invalid history cursor." }, 400)
    }

    // Every page is ownership-scoped, including client-supplied cursor bounds.
    // Deleted users have null FoodItem.userId and cannot match this relation.
    const ownership = { foodItem: { userId } }
    let entries: ItemHistoryEntry[]
    if (status === "USED") {
      const rows = await prisma.usedItem.findMany({
        where: {
          ...ownership,
          ...(cursor ? { OR: [
            { markedUsedAt: { lt: new Date(cursor.at) } },
            { markedUsedAt: new Date(cursor.at), id: { lt: cursor.id } },
          ] } : {}),
        },
        orderBy: [{ markedUsedAt: "desc" }, { id: "desc" }],
        take: limit + 1,
        select: { ...snapshotSelect, markedUsedAt: true },
      })
      entries = rows.map((row) => ({
        id: row.id, foodItemId: row.foodItemId, name: row.name, quantity: row.quantity,
        categoryId: row.categoryId, categoryName: row.category.name,
        dateAdded: row.foodItem.dateAdded.toISOString(),
        status: "USED", usedAt: row.markedUsedAt.toISOString(), wastedAt: null,
      }))
    } else {
      const rows = await prisma.wastedItem.findMany({
        where: {
          ...ownership,
          ...(cursor ? { OR: [
            { markedWastedAt: { lt: new Date(cursor.at) } },
            { markedWastedAt: new Date(cursor.at), id: { lt: cursor.id } },
          ] } : {}),
        },
        orderBy: [{ markedWastedAt: "desc" }, { id: "desc" }],
        take: limit + 1,
        select: { ...snapshotSelect, markedWastedAt: true },
      })
      entries = rows.map((row) => ({
        id: row.id, foodItemId: row.foodItemId, name: row.name, quantity: row.quantity,
        categoryId: row.categoryId, categoryName: row.category.name,
        dateAdded: row.foodItem.dateAdded.toISOString(),
        status: "WASTED", usedAt: null, wastedAt: row.markedWastedAt.toISOString(),
      }))
    }

    const hasMore = entries.length > limit
    const items = entries.slice(0, limit)
    const last = items.at(-1)
    const nextCursor = hasMore && last ? Buffer.from(JSON.stringify({
      v: 1, status, at: last.usedAt ?? last.wastedAt, id: last.id,
    } satisfies Cursor)).toString("base64url") : null
    const response: ItemHistoryResponse = { items, pagination: { limit, hasMore, nextCursor } }
    return json(response)
  } catch {
    // Never send raw database errors or history contents to clients or logs.
    await logError({
      message: "Failed to load item history.",
      errorType: "ITEM_HISTORY_FETCH_FAILED",
      source: "API",
    })
    return json({ error: "Unable to load item history. Please try again." }, 500)
  }
}
