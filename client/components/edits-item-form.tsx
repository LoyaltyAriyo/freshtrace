"use client"

import { useState } from "react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"

type FoodItem = {
  id?: string
  name: string
  quantity: number
  category: string
  expiryDate: string
}

type Props = {
  initialData?: FoodItem
  onSubmit: (data: FoodItem) => void
}

export default function EditItemForm({ initialData, onSubmit }: Props) {
  const [form, setForm] = useState<FoodItem>({
    name: initialData?.name || "",
    quantity: initialData?.quantity || 1,
    category: initialData?.category || "",
    expiryDate: initialData?.expiryDate || "",
  })

  const handleChange = (field: keyof FoodItem, value: any) => {
    setForm((prev) => ({ ...prev, [field]: value }))
  }

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    onSubmit(form)
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      {/* Name */}
      <div>
        <Label>Name</Label>
        <Input
          value={form.name}
          onChange={(e) => handleChange("name", e.target.value)}
          placeholder="Enter item name"
          required
        />
      </div>

      {/* Quantity */}
      <div>
        <Label>Quantity</Label>
        <Input
          type="number"
          value={form.quantity}
          onChange={(e) => handleChange("quantity", Number(e.target.value))}
          min={1}
        />
      </div>

      {/* Category */}
      <div>
        <Label>Category</Label>
        <Input
          value={form.category}
          onChange={(e) => handleChange("category", e.target.value)}
          placeholder="e.g. Dairy, Meat"
        />
      </div>

      {/* Expiry Date */}
      <div>
        <Label>Expiry Date</Label>
        <Input
          type="date"
          value={form.expiryDate}
          onChange={(e) => handleChange("expiryDate", e.target.value)}
        />
      </div>

      {/* Submit */}
      <Button type="submit" className="w-full">
        Save Item
      </Button>
    </form>
  )
}