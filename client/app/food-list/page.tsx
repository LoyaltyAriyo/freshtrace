"use client"

import { Suspense, useEffect, useId, useMemo, useState } from "react"
import { useSearchParams } from "next/navigation"
import { Loader2 } from "lucide-react"

import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert"
import { Button } from "@/components/ui/button"
import { CategoryDropdown } from "@/components/category-dropdown"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import {
  ITEM_NAME_MAX_LENGTH,
  ITEM_QUANTITY_MAX,
  type ItemFieldErrors,
  validateFoodItemInput,
} from "@/lib/validations"

type FoodListItem = {
  id: string
  name: string
  quantity: number
  categoryId: string
  categoryName: string
  dateAdded: string
  priority: "use-first" | "use-soon" | "use-later"
}

const priorityStyles: Record<string, string> = {
  "use-first": "bg-red-100 text-red-800",
  "use-soon": "bg-yellow-100 text-yellow-800",
  "use-later": "bg-green-100 text-green-800",
}

// Alias kept so the rest of the component compiles without renaming every
// reference.  The canonical types now live in @/lib/validations.
type EditFieldErrors = ItemFieldErrors

function FoodListPageContent() {
  const searchParams = useSearchParams()
  const editNameErrorId = useId()
  const editQuantityErrorId = useId()
  const [items, setItems] = useState<FoodListItem[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState("")
  const [actionError, setActionError] = useState("")
  const [updatingItemId, setUpdatingItemId] = useState<string | null>(null)

  const [editOpen, setEditOpen] = useState(false)
  const [editingItemId, setEditingItemId] = useState<string | null>(null)
  const [editName, setEditName] = useState("")
  const [editQuantityInput, setEditQuantityInput] = useState("1")
  const [editCategoryId, setEditCategoryId] = useState("")
  const [editFieldErrors, setEditFieldErrors] = useState<EditFieldErrors>({})
  const [editSaving, setEditSaving] = useState(false)
  const [editFeedback, setEditFeedback] = useState<{
    type: "success" | "error"
    message: string
  } | null>(null)

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
            categoryId: typeof item.categoryId === "string" ? item.categoryId : "",
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

  function openEdit(item: FoodListItem) {
    setEditFeedback(null)
    setActionError("")
    setEditFieldErrors({})
    setEditingItemId(item.id)
    setEditName(item.name)
    setEditQuantityInput(String(item.quantity))
    setEditCategoryId(item.categoryId)
    setEditOpen(true)
  }

  async function saveEditedItem() {
    if (!editingItemId) return

    setEditFeedback(null)

    const validation = validateFoodItemInput(editName, editQuantityInput, editCategoryId)
    if (validation) {
      setEditFieldErrors(validation)
      return
    }

    setEditFieldErrors({})
    const trimmedName = editName.trim()
    const parsedQuantity = Number.parseInt(editQuantityInput.trim(), 10)

    setEditSaving(true)

    try {
      const response = await fetch(`/api/items/${editingItemId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: trimmedName,
          quantity: parsedQuantity,
          categoryId: editCategoryId,
        }),
      })

      const data = (await response.json().catch(() => null)) as { error?: string; name?: string } | null

      if (!response.ok) {
        setEditFeedback({
          type: "error",
          message: data?.error || "Failed to update item.",
        })
        return
      }

      const displayName = typeof data?.name === "string" && data.name.trim() ? data.name : trimmedName

      setEditOpen(false)
      setEditingItemId(null)
      setEditFeedback({
        type: "success",
        message:
          displayName.length > 0
            ? `"${displayName}" was updated successfully.`
            : "Item was updated successfully.",
      })
      await loadItems()
    } catch {
      setEditFeedback({
        type: "error",
        message: "Failed to update item. Please try again.",
      })
    } finally {
      setEditSaving(false)
    }
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

      {editFeedback?.type === "success" && (
        <Alert data-testid="edit-item-success">
          <AlertTitle>Changes saved</AlertTitle>
          <AlertDescription>{editFeedback.message}</AlertDescription>
        </Alert>
      )}

      {editFeedback?.type === "error" && (
        <Alert variant="destructive" data-testid="edit-item-error">
          <AlertTitle>Could not save changes</AlertTitle>
          <AlertDescription>{editFeedback.message}</AlertDescription>
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
                type="button"
                onClick={() => openEdit(item)}
                aria-label="Edit"
                disabled={updatingItemId === item.id}
                className="rounded-md border px-3 py-1 text-xs hover:bg-muted"
              >
                Edit
              </button>
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

      <Dialog
        open={editOpen}
        onOpenChange={(open) => {
          setEditOpen(open)
          if (!open) {
            setEditingItemId(null)
            setEditSaving(false)
            setEditFieldErrors({})
            setEditFeedback((prev) => (prev?.type === "error" ? null : prev))
          }
        }}
      >
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Edit item</DialogTitle>
            <DialogDescription>Update the name, quantity, or category, then save your changes.</DialogDescription>
          </DialogHeader>
          <div className="flex flex-col gap-4 py-2">
            <div className="flex flex-col gap-1">
              <Label htmlFor="edit-item-name">Name</Label>
              <Input
                id="edit-item-name"
                value={editName}
                onChange={(e) => {
                  setEditName(e.target.value)
                  setEditFieldErrors((prev) => {
                    if (!prev.name) return prev
                    const next = { ...prev }
                    delete next.name
                    return next
                  })
                }}
                maxLength={ITEM_NAME_MAX_LENGTH}
                disabled={editSaving}
                aria-invalid={editFieldErrors.name ? true : undefined}
                aria-describedby={editFieldErrors.name ? editNameErrorId : undefined}
              />
              {editFieldErrors.name ? (
                <p id={editNameErrorId} className="text-sm text-destructive" role="alert">
                  {editFieldErrors.name}
                </p>
              ) : null}
            </div>
            <div className="flex flex-col gap-1">
              <Label htmlFor="edit-item-quantity">Quantity</Label>
              <Input
                id="edit-item-quantity"
                type="number"
                min={1}
                max={ITEM_QUANTITY_MAX}
                step={1}
                value={editQuantityInput}
                onChange={(e) => {
                  setEditQuantityInput(e.target.value)
                  setEditFieldErrors((prev) => {
                    if (!prev.quantity) return prev
                    const next = { ...prev }
                    delete next.quantity
                    return next
                  })
                }}
                disabled={editSaving}
                aria-invalid={editFieldErrors.quantity ? true : undefined}
                aria-describedby={editFieldErrors.quantity ? editQuantityErrorId : undefined}
              />
              {editFieldErrors.quantity ? (
                <p id={editQuantityErrorId} className="text-sm text-destructive" role="alert">
                  {editFieldErrors.quantity}
                </p>
              ) : null}
            </div>
            <div className="flex flex-col gap-1">
              <Label>Category</Label>
              <CategoryDropdown
                value={editCategoryId}
                onValueChange={(value) => {
                  setEditCategoryId(value)
                  setEditFieldErrors((prev) => {
                    if (!prev.categoryId) return prev
                    const next = { ...prev }
                    delete next.categoryId
                    return next
                  })
                }}
                disabled={editSaving}
                errorMessage={editFieldErrors.categoryId}
              />
            </div>
          </div>
          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => setEditOpen(false)} disabled={editSaving}>
              Cancel
            </Button>
            <Button type="button" onClick={() => void saveEditedItem()} disabled={editSaving}>
              {editSaving && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              Save changes
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
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
