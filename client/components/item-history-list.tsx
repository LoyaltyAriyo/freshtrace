"use client"

import { useCallback, useEffect, useRef, useState } from "react"
import { Button } from "@/components/ui/button"
import type { HistoryStatus, ItemHistoryEntry, ItemHistoryResponse } from "@/lib/item-history"

export function ItemHistoryList({ status }: { status: HistoryStatus }) {
  const [items, setItems] = useState<ItemHistoryEntry[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(false)
  const [nextCursor, setNextCursor] = useState<string | null>(null)
  const request = useRef<AbortController | null>(null)
  const retryCursor = useRef<string | null>(null)
  const label = status === "USED" ? "Used" : "Wasted"

  const load = useCallback(async (cursor: string | null = null) => {
    if (request.current && !request.current.signal.aborted) return
    const controller = new AbortController()
    request.current = controller
    retryCursor.current = cursor
    setLoading(true)
    setError(false)
    try {
      const params = new URLSearchParams({ status })
      if (cursor) params.set("cursor", cursor)
      const response = await fetch(`/api/items/history?${params}`, {
        signal: controller.signal,
        cache: "no-store",
        credentials: "same-origin",
      })
      if (!response.ok) throw new Error("History request failed")
      const data = await response.json() as ItemHistoryResponse
      if (!Array.isArray(data.items) || !data.pagination ||
        data.items.some((item) => item.status !== status) ||
        (data.pagination.nextCursor !== null && typeof data.pagination.nextCursor !== "string")) {
        throw new Error("Invalid history response")
      }
      if (controller.signal.aborted) return
      setItems((previous) => {
        const unique = new Map<string, ItemHistoryEntry>()
        for (const item of [...(cursor ? previous : []), ...data.items]) {
          if (!unique.has(item.id)) unique.set(item.id, item)
        }
        return [...unique.values()]
      })
      setNextCursor(data.pagination.nextCursor)
    } catch {
      if (!controller.signal.aborted) setError(true)
    } finally {
      if (!controller.signal.aborted) setLoading(false)
      if (request.current === controller) request.current = null
    }
  }, [status])

  useEffect(() => {
    void load()
    return () => { request.current?.abort() }
  }, [load])

  return (
    <div className="flex flex-col gap-4" aria-busy={loading}>
      <h2 className="text-lg font-medium">{label} history</h2>
      <ul className="flex flex-col gap-2" aria-label={`${label} items`}>
        {items.map((item) => {
          const markedAt = item.usedAt ?? item.wastedAt
          return (
            <li key={item.id} className="flex flex-col gap-1 rounded-lg border p-4">
              <span className="font-medium">{item.name}</span>
              <span className="text-sm text-muted-foreground">{item.categoryName}</span>
              <span className="text-sm text-muted-foreground">Qty: {item.quantity}</span>
              {item.dateAdded && (
                <span className="text-sm text-muted-foreground">
                  Added: <time dateTime={item.dateAdded}>{new Date(item.dateAdded).toLocaleDateString()}</time>
                </span>
              )}
              <span className="text-sm text-muted-foreground">
                {label} on: <time dateTime={markedAt}>{new Date(markedAt).toLocaleString()}</time>
              </span>
            </li>
          )
        })}
      </ul>
      {loading && <p role="status">Loading {label.toLowerCase()} history...</p>}
      {error && (
        <div role="alert" className="flex flex-col items-start gap-2">
          <p>Unable to load {label.toLowerCase()} history. Please try again.</p>
          <Button variant="outline" onClick={() => void load(retryCursor.current)}>Retry</Button>
        </div>
      )}
      {!loading && !error && items.length === 0 && (
        <p>No {label.toLowerCase()} items yet. Items you mark as {label.toLowerCase()} will appear here.</p>
      )}
      {nextCursor && !error && (
        <Button variant="outline" disabled={loading} onClick={() => void load(nextCursor)}>
          Load more {label.toLowerCase()} items
        </Button>
      )}
    </div>
  )
}
