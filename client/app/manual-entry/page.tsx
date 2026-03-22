"use client"

import { useState } from "react"

export default function ManualEntryPage() {
  const [name, setName] = useState("")
  const [category, setCategory] = useState("produce")
  const [quantity, setQuantity] = useState("")
  const [submitted, setSubmitted] = useState(false)

  function handleSubmit() {
    if (!name) return
    setSubmitted(true)
    setName("")
    setCategory("produce")
    setQuantity("")
    setTimeout(() => setSubmitted(false), 3000)
  }

  return (
    <div className="flex flex-col gap-6">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">Manual Entry</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Add a food item manually to your list
        </p>
      </div>

      <div className="flex flex-col gap-4 rounded-lg border p-6">
        <div className="flex flex-col gap-1">
          <label className="text-sm font-medium">Item Name</label>
          <input
            type="text"
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="e.g. Milk, Chicken, Apple"
            className="rounded-md border px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-primary"
          />
        </div>

        <div className="flex flex-col gap-1">
          <label className="text-sm font-medium">Category</label>
          <select
            value={category}
            onChange={(e) => setCategory(e.target.value)}
            className="rounded-md border px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-primary"
          >
            <option value="produce">Produce</option>
            <option value="dairy">Dairy</option>
            <option value="meat">Meat</option>
            <option value="pantry">Pantry</option>
            <option value="leftovers">Leftovers</option>
            <option value="other">Other</option>
          </select>
        </div>

        <div className="flex flex-col gap-1">
          <label className="text-sm font-medium">Quantity</label>
          <input
            type="text"
            value={quantity}
            onChange={(e) => setQuantity(e.target.value)}
            placeholder="e.g. 1 litre, 500g"
            className="rounded-md border px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-primary"
          />
        </div>

        {submitted && (
          <p className="text-sm text-green-600 font-medium">✓ Item added successfully!</p>
        )}

        <button
          onClick={handleSubmit}
          className="rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground hover:bg-primary/90"
        >
          Add Item
        </button>
      </div>
    </div>
  )
}