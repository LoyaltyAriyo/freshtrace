"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"
import { Loader2 } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert"
import { CategoryDropdown } from "@/components/category-dropdown"

export function ManualEntryForm() {
  const router = useRouter()

  const [name, setName] = useState("")
  const [quantity, setQuantity] = useState(1)
  const [categoryId, setCategoryId] = useState("")
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState("")

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()

    const trimmedName = name.trim()
    if (!trimmedName) {
      setError("Item name is required.")
      return
    }
    if (!categoryId) {
      setError("Please select a category.")
      return
    }

    setLoading(true)
    setError("")

    try {
      const response = await fetch("/api/items", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name: trimmedName, quantity, categoryId }),
      })

      if (!response.ok) {
        const data = await response.json().catch(() => null)
        throw new Error(data?.error || "Failed to save item.")
      }

      router.push("/food-list")
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to save item.")
      setLoading(false)
    }
  }

  return (
    <form onSubmit={handleSubmit} noValidate className="flex flex-col gap-4">
      {error && (
        <Alert variant="destructive">
          <AlertTitle>Error</AlertTitle>
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      )}

      <div className="flex flex-col gap-1">
        <Label htmlFor="item-name">Item Name</Label>
        <Input
          id="item-name"
          placeholder="e.g. Whole Milk"
          value={name}
          onChange={(e) => setName(e.target.value)}
          disabled={loading}
          aria-required="true"
        />
      </div>

      <div className="flex flex-col gap-1">
        <Label htmlFor="item-quantity">Quantity</Label>
        <Input
          id="item-quantity"
          type="number"
          min={1}
          value={quantity}
          onChange={(e) => setQuantity(Math.max(1, Number(e.target.value)))}
          disabled={loading}
          aria-required="true"
        />
      </div>

      <div className="flex flex-col gap-1">
        <Label>Category</Label>
        <CategoryDropdown
          value={categoryId}
          onValueChange={setCategoryId}
          disabled={loading}
        />
      </div>

      <Button type="submit" disabled={loading} className="w-fit">
        {loading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
        Save Item
      </Button>
    </form>
  )
}
