"use client"

import { useState } from "react"
import { PlusCircle } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"

export type Category = {
  id: string
  name: string
}

export type DraftItemInput = {
  name: string
  quantity: number
  categoryId: string
}

type Props = {
  categories: Category[]
  onAdd: (item: DraftItemInput) => void
}

export function AddDraftItemForm({ categories, onAdd }: Props) {
  const [name, setName] = useState("")
  const [quantity, setQuantity] = useState(1)
  const [categoryId, setCategoryId] = useState("")
  const [error, setError] = useState("")

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault()

    const trimmedName = name.trim()

    if (!trimmedName) {
      setError("Item name is required.")
      return
    }

    if (quantity < 1) {
      setError("Quantity must be at least 1.")
      return
    }

    if (!categoryId) {
      setError("Please select a category.")
      return
    }

    setError("")
    onAdd({ name: trimmedName, quantity, categoryId })

    setName("")
    setQuantity(1)
    setCategoryId("")
  }

  return (
    <form onSubmit={handleSubmit} noValidate aria-label="Add item form">
      <div className="flex flex-col gap-3">
        <div className="grid grid-cols-[1fr_80px_160px_auto] items-end gap-2">
          <div className="flex flex-col gap-1">
            <Label htmlFor="item-name">Item Name</Label>
            <Input
              id="item-name"
              placeholder="e.g. Whole Milk"
              value={name}
              onChange={(e) => setName(e.target.value)}
              aria-required="true"
            />
          </div>

          <div className="flex flex-col gap-1">
            <Label htmlFor="item-quantity">Qty</Label>
            <Input
              id="item-quantity"
              type="number"
              min={1}
              value={quantity}
              onChange={(e) => setQuantity(Math.max(1, Number(e.target.value)))}
              aria-required="true"
            />
          </div>

          <div className="flex flex-col gap-1">
            <Label htmlFor="item-category">Category</Label>
            <Select value={categoryId} onValueChange={setCategoryId}>
              <SelectTrigger id="item-category" aria-required="true">
                <SelectValue placeholder="Select category" />
              </SelectTrigger>
              <SelectContent>
                {categories.map((cat) => (
                  <SelectItem key={cat.id} value={cat.id}>
                    {cat.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <Button type="submit" aria-label="Add item">
            <PlusCircle className="mr-2 h-4 w-4" />
            Add
          </Button>
        </div>

        {error && (
          <p className="text-sm text-destructive" role="alert">
            {error}
          </p>
        )}
      </div>
    </form>
  )
}
