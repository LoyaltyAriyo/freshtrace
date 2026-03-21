"use client"

import { useRouter, useSearchParams } from "next/navigation"
import { useState } from "react"
import { Button } from "@/components/ui/button"
import { Loader2 } from "lucide-react"

export default function ReviewPage() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const receiptId = searchParams.get("receiptId")

  const [loading, setLoading] = useState(false)
  const [error, setError] = useState("")

  async function handleConfirm() {
    if (!receiptId) {
      setError("No receipt ID found.")
      return
    }

    setLoading(true)
    setError("")

    try {
      const response = await fetch(`/api/receipts/${receiptId}/review`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ selectedItemIds: [] }),
      })

      if (!response.ok) {
        const data = await response.json().catch(() => null)
        throw new Error(data?.error || "Failed to confirm items.")
      }

      router.push("/food-list")
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to confirm items.")
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="flex flex-col gap-4">
      <h1 className="text-2xl font-semibold tracking-tight">Review Extracted Items</h1>
      <p className="text-sm text-muted-foreground">
        Review page placeholder. We will replace this with the review page later.
      </p>

      {error && (
        <p className="text-sm text-destructive" role="alert">
          {error}
        </p>
      )}

      <Button onClick={handleConfirm} disabled={loading} className="w-fit">
        {loading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
        Confirm Items
      </Button>
    </div>
  )
}
