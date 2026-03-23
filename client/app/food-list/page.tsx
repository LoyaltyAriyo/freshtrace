"use client"

import { useMemo, useState } from "react"
import { useSearchParams } from "next/navigation"

import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert"

const mockItems = [
  { id: "1", name: "Milk", category: "Dairy", expiryDate: "2026-03-24", priority: "use-first" },
  { id: "2", name: "Chicken Breast", category: "Meat", expiryDate: "2026-03-23", priority: "use-first" },
  { id: "3", name: "Apple", category: "Produce", expiryDate: "2026-03-30", priority: "use-soon" },
  { id: "4", name: "Yogurt", category: "Dairy", expiryDate: "2026-03-28", priority: "use-soon" },
  { id: "5", name: "Bread", category: "Pantry", expiryDate: "2026-03-25", priority: "use-later" },
]

const priorityStyles: Record<string, string> = {
  "use-first": "bg-red-100 text-red-800",
  "use-soon": "bg-yellow-100 text-yellow-800",
  "use-later": "bg-green-100 text-green-800",
}

export default function FoodListPage() {
  const searchParams = useSearchParams()
  const [items, setItems] = useState(mockItems)

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

  function markUsed(id: string) {
    setItems((prev) => prev.filter((i) => i.id !== id))
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

      <div className="flex flex-col gap-2">
        {items.map((item) => (
          <div key={item.id} className="flex items-center justify-between rounded-lg border p-4">
            <div className="flex flex-col gap-1">
              <span className="font-medium">{item.name}</span>
              <span className="text-sm text-muted-foreground">{item.category}</span>
              <span className="text-sm text-muted-foreground">Expires: {item.expiryDate}</span>
            </div>
            <div className="flex items-center gap-2">
              <span className={`rounded-full px-3 py-1 text-xs font-medium ${priorityStyles[item.priority]}`}>
                {item.priority === "use-first" ? "Use First" : item.priority === "use-soon" ? "Use Soon" : "Use Later"}
              </span>
              <button
                onClick={() => markUsed(item.id)}
                className="rounded-md border px-3 py-1 text-xs hover:bg-muted"
              >
                Used
              </button>
            </div>
          </div>
        ))}

        {items.length === 0 && (
          <div className="flex flex-col items-center gap-3 py-12 text-center">
            <p className="text-sm font-medium">No items found</p>
            <p className="text-xs text-muted-foreground">Your kitchen is empty. Add some items to get started!</p>
          </div>
        )}
      </div>
    </div>
  )
}