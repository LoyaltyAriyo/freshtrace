"use client"

import { Suspense, useEffect, useMemo, useState } from "react"
import { useSearchParams } from "next/navigation"
import { Loader2 } from "lucide-react"

import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert"

type FoodListItem = {
  id: string
  name: string
  quantity: number
  categoryName: string
  dateAdded: string
  priority: "use-first" | "use-soon" | "use-later"
}

const priorityStyles: Record<string, string> = {
  "use-first": "bg-red-100 text-red-800",
  "use-soon": "bg-yellow-100 text-yellow-800",
  "use-later": "bg-green-100 text-green-800",
}

function FoodListPageContent() {
  const searchParams = useSearchParams()
  const [items, setItems] = useState<FoodListItem[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState("")
  const [actionError, setActionError] = useState("")
  const [updatingItemId, setUpdatingItemId] = useState<string | null>(null)

  async function loadItems() {
    setLoading(true)
    setError("")

    try {
      const response = await fetch("/api/items")
      const data = await response.json().catch(() => null)

      if (!response.ok) {
        throw new Error(data?.error || "Failed to load food items.")
      }

      if (!Array.isArray(data)) {
        throw new Error("Invalid food list response.")
      }

      const normalized: FoodListItem[] = data
        .filter((item): item is Record<string, unknown> => !!item && typeof item === "object")
        .map((item) => {
          const rawPriority = item.priority
          const priority: FoodListItem["priority"] =
            rawPriority === "use-first" || rawPriority === "use-soon" || rawPriority === "use-later"
              ? rawPriority
              : "use-later"

          return {
            id: typeof item.id === "string" ? item.id : "",
            name: typeof item.name === "string" ? item.name : "Unnamed item",
            quantity:
              typeof item.quantity === "number" && Number.isFinite(item.quantity)
                ? Math.max(1, Math.floor(item.quantity))
                : 1,
            categoryName:
              typeof item.categoryName === "string" && item.categoryName.trim()
                ? item.categoryName
                : "Uncategorized",
            dateAdded: typeof item.dateAdded === "string" ? item.dateAdded : "",
            priority,
          }
        })
        .filter((item) => item.id)

      setItems(normalized)
      setLoading(false)
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load food items.")
      setLoading(false)
    }
  }

  useEffect(() => {
    let cancelled = false

    async function loadItemsSafe() {
      await loadItems()
      if (cancelled) return
    }

    loadItemsSafe()

    return () => {
      cancelled = true
    }
  }, [])

  const saveSuccessMessage = useMemo(() => {
    if (searchParams.get("saved") !== "1") {
      return null
    }

    const rawCount = Number(searchParams.get("count"))
    if (!Number.isFinite(rawCount) || rawCount <= 0) {
      return "Items saved to your food list successfully."
    }

    const count = Math.floor(rawCount)
    return `${count} ${count === 1 ? "item" : "items"} saved to your food list successfully.`
  }, [searchParams])

  async function updateItemStatus(id: string, action: "used" | "wasted") {
    setActionError("")
    setUpdatingItemId(id)

    try {
      const response = await fetch(`/api/items/${id}/${action}`, {
        method: "POST",
      })
      const data = await response.json().catch(() => null)

      if (!response.ok) {
        throw new Error(
          data?.error ||
            (action === "used"
              ? "Failed to mark item as used."
              : "Failed to mark item as wasted.")
        )
      }

      await loadItems()
    } catch (err) {
      setActionError(
        err instanceof Error
          ? err.message
          : action === "used"
            ? "Failed to mark item as used."
            : "Failed to mark item as wasted."
      )
    } finally {
      setUpdatingItemId(null)
    }
  }

  async function markUsed(id: string) {
    await updateItemStatus(id, "used")
  }

  async function markWasted(id: string) {
    await updateItemStatus(id, "wasted")
  }

  function formatDate(value: string) {
    const date = new Date(value)
    if (Number.isNaN(date.getTime())) return "Unknown"
    return date.toLocaleDateString()
  }

  return (
    <div className="flex flex-col gap-6">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">Food List</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          {items.length} active items in your kitchen
        </p>
      </div>

      {saveSuccessMessage && (
        <Alert data-testid="save-success">
          <AlertTitle>Items saved</AlertTitle>
          <AlertDescription>{saveSuccessMessage}</AlertDescription>
        </Alert>
      )}

      {error && (
        <Alert variant="destructive" data-testid="items-load-error">
          <AlertTitle>Unable to load items</AlertTitle>
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      )}

      {actionError && (
        <Alert variant="destructive" data-testid="items-action-error">
          <AlertTitle>Unable to update item</AlertTitle>
          <AlertDescription>{actionError}</AlertDescription>
        </Alert>
      )}

      {loading && (
        <div className="flex items-center gap-2 text-sm text-muted-foreground" data-testid="items-loading">
          <Loader2 className="h-4 w-4 animate-spin" />
          <span>Loading your food list...</span>
        </div>
      )}

      <div className="flex flex-col gap-2">
        {!loading && items.map((item) => (
          <div key={item.id} className="flex items-center justify-between rounded-lg border p-4">
            <div className="flex flex-col gap-1">
              <span className="font-medium">{item.name}</span>
              <span className="text-sm text-muted-foreground">{item.categoryName}</span>
              <span className="text-sm text-muted-foreground">Qty: {item.quantity}</span>
              <span className="text-sm text-muted-foreground">Added: {formatDate(item.dateAdded)}</span>
            </div>
            <div className="flex items-center gap-2">
              <span className={`rounded-full px-3 py-1 text-xs font-medium ${priorityStyles[item.priority]}`}>
                {item.priority === "use-first" ? "Use First" : item.priority === "use-soon" ? "Use Soon" : "Use Later"}
              </span>
              <button
                onClick={() => markUsed(item.id)}
                aria-label="Used"
                disabled={updatingItemId === item.id}
                className="rounded-md border px-3 py-1 text-xs hover:bg-muted flex items-center gap-1"
              >
                ✓ {updatingItemId === item.id ? "Updating..." : "Mark as Used"}
              </button>
              <button
                onClick={() => markWasted(item.id)}
                aria-label="Wasted"
                disabled={updatingItemId === item.id}
                className="rounded-md border border-red-200 px-3 py-1 text-xs text-red-700 hover:bg-red-50 flex items-center gap-1"
              >
                ✕ {updatingItemId === item.id ? "Updating..." : "Mark as Wasted"}
              </button>
            </div>
          </div>
        ))}

        {!loading && items.length === 0 && (
          <div className="flex flex-col items-center gap-3 py-12 text-center">
            <p className="text-sm font-medium">No items found</p>
            <p className="text-xs text-muted-foreground">Your kitchen is empty. Add some items to get started!</p>
          </div>
        )}
      </div>
    </div>
  )
}

export default function FoodListPage() {
  return (
    <Suspense fallback={null}>
      <FoodListPageContent />
    </Suspense>
  )
}
