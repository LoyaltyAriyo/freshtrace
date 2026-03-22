"use client"

import { useRouter, useSearchParams } from "next/navigation"
import { useState } from "react"
import { AlertCircle, Loader2 } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert"

type SaveError =
  | { type: "missing_receipt" }
  | { type: "validation"; message: string }
  | { type: "category_missing"; message: string }
  | { type: "server"; message: string }
  | { type: "network" }

function getErrorContent(error: SaveError): { title: string; description: string; canRetry: boolean } {
  switch (error.type) {
    case "missing_receipt":
      return {
        title: "Invalid page",
        description: "No receipt ID was found. Please go back and upload a receipt.",
        canRetry: false,
      }
    case "validation":
      return {
        title: "Nothing to save",
        description: error.message,
        canRetry: false,
      }
    case "category_missing":
      return {
        title: "Category required",
        description: error.message,
        canRetry: false,
      }
    case "server":
      return {
        title: "Something went wrong",
        description: error.message,
        canRetry: true,
      }
    case "network":
      return {
        title: "Connection error",
        description: "Could not reach the server. Check your connection and try again.",
        canRetry: true,
      }
  }
}

async function saveReviewedItems(receiptId: string, selectedItemIds: string[]): Promise<SaveError | null> {
  let response: Response

  try {
    response = await fetch(`/api/receipts/${receiptId}/review`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ selectedItemIds }),
    })
  } catch {
    return { type: "network" }
  }

  if (response.ok) return null

  const data = await response.json().catch(() => null)
  const message = data?.error || "An unexpected error occurred."

  if (response.status === 400) return { type: "validation", message }
  if (response.status === 422) return { type: "category_missing", message }
  return { type: "server", message }
}

export default function ReviewPage() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const receiptId = searchParams.get("receiptId")

  const [loading, setLoading] = useState(false)
  const [saveError, setSaveError] = useState<SaveError | null>(null)

  async function handleConfirm() {
    if (!receiptId) {
      setSaveError({ type: "missing_receipt" })
      return
    }

    setLoading(true)
    setSaveError(null)

    const error = await saveReviewedItems(receiptId, [])

    if (error) {
      setSaveError(error)
      setLoading(false)
      return
    }

    router.push("/food-list")
  }

  const errorContent = saveError ? getErrorContent(saveError) : null

  return (
    <div className="flex flex-col gap-4">
      <h1 className="text-2xl font-semibold tracking-tight">Review Extracted Items</h1>
      <p className="text-sm text-muted-foreground">
        Review page placeholder. We will replace this with the review page later.
      </p>

      {errorContent && (
        <Alert variant="destructive">
          <AlertCircle className="h-4 w-4" />
          <AlertTitle>{errorContent.title}</AlertTitle>
          <AlertDescription className="flex flex-col gap-2">
            <span>{errorContent.description}</span>
            {errorContent.canRetry && (
              <Button
                variant="outline"
                size="sm"
                className="w-fit"
                onClick={handleConfirm}
                disabled={loading}
              >
                Try again
              </Button>
            )}
          </AlertDescription>
        </Alert>
      )}

      <Button
        onClick={handleConfirm}
        disabled={loading || saveError?.type === "missing_receipt"}
        className="w-fit"
      >
        {loading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
        Confirm Items
      </Button>
    </div>
  )
}
