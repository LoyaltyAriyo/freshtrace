"use client"

import { useEffect, useId, useState } from "react"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"

type Category = {
  id: string
  name: string
}

type Props = {
  value: string
  onValueChange: (value: string) => void
  disabled?: boolean
  placeholder?: string
  /** When set, marks the control invalid and shows the message below (e.g. form validation). */
  errorMessage?: string
}

export function CategoryDropdown({
  value,
  onValueChange,
  disabled = false,
  placeholder = "Select category",
  errorMessage,
}: Props) {
  const errorId = useId()
  const [categories, setCategories] = useState<Category[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    fetch("/api/categories")
      .then((res) => res.json())
      .then((data: unknown) => {
        setCategories(Array.isArray(data) ? (data as Category[]) : [])
      })
      .catch(() => setCategories([]))
      .finally(() => setLoading(false))
  }, [])

  return (
    <div className="flex flex-col gap-1">
      <Select value={value} onValueChange={onValueChange} disabled={disabled || loading}>
        <SelectTrigger
          aria-label="Category"
          aria-invalid={errorMessage ? true : undefined}
          aria-describedby={errorMessage ? errorId : undefined}
        >
          <SelectValue placeholder={loading ? "Loading…" : placeholder} />
        </SelectTrigger>
        <SelectContent>
          {categories.map((cat) => (
            <SelectItem key={cat.id} value={cat.id}>
              {cat.name}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
      {errorMessage ? (
        <p id={errorId} className="text-sm text-destructive" role="alert">
          {errorMessage}
        </p>
      ) : null}
    </div>
  )
}
