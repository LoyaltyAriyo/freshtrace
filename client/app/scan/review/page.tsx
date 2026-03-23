"use client"

import { useRouter, useSearchParams } from "next/navigation"
import { useEffect, useMemo, useState } from "react"
import { AlertCircle, Loader2 } from "lucide-react"

import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card"
import { Checkbox } from "@/components/ui/checkbox"

type DraftItem = {
  id: string
  name: string | null
  quantity: number | null
  categoryId: string | null
  confidence?: number | null
  isSelected?: boolean | null
}

type ReceiptReviewResponse = {
  id: string
  ocrStatus: string
  imagePath: string | null
  draftItems: DraftItem[]
}

type FetchStatus = "idle" | "loading" | "success" | "empty" | "error"

type LoadError =
  | { type: "missing_receipt" }
  | { type: "not_found" }
  | { type: "network" }
  | { type: "server"; message?: string }

type SaveError =
  | { type: "missing_receipt" }
  | { type: "validation"; message: string }
  | { type: "category_missing"; message: string }
  | { type: "server"; message: string }
  | { type: "network" }

type ItemIssue =
  | { type: "missing_name"; message: string }
  | { type: "invalid_quantity"; message: string }
  | { type: "missing_category"; message: string }
  | { type: "low_confidence"; message: string }

const LOW_CONFIDENCE_THRESHOLD = 0.6

function mapDraftItems(rawDraftItems: unknown): DraftItem[] {
  if (!Array.isArray(rawDraftItems)) return []

  const mapped: DraftItem[] = []

  for (const raw of rawDraftItems) {
    if (!raw || typeof raw !== "object") continue

    const item = raw as Record<string, unknown>

    const idValue = item.id
    if (typeof idValue !== "string" || !idValue) continue

    const nameValue = item.name
    const name =
      typeof nameValue === "string"
        ? nameValue
        : ""

    const quantityValue = item.quantity
    let quantity: number | null = null
    if (typeof quantityValue === "number" && !Number.isNaN(quantityValue)) {
      quantity = quantityValue
    } else if (
      typeof quantityValue === "string" &&
      quantityValue.trim() !== ""
    ) {
      const parsed = Number(quantityValue)
      if (!Number.isNaN(parsed)) {
        quantity = parsed
      }
    }

    if (quantity === null) {
      quantity = 1
    }

    const categoryValue = item.categoryId
    const categoryId =
      typeof categoryValue === "string" && categoryValue.trim() !== ""
        ? categoryValue
        : null

    const confidenceValue = item.confidence
    const confidence =
      typeof confidenceValue === "number" && !Number.isNaN(confidenceValue)
        ? confidenceValue
        : null

    const isSelectedValue = item.isSelected
    const isSelected =
      typeof isSelectedValue === "boolean" ? isSelectedValue : true

    mapped.push({
      id: idValue,
      name,
      quantity,
      categoryId,
      confidence,
      isSelected,
    })
  }

  return mapped
}

function getLoadErrorContent(error: LoadError): {
  title: string
  description: string
  canRetry: boolean
} {
  switch (error.type) {
    case "missing_receipt":
      return {
        title: "Receipt not found",
        description: "No receipt ID was found. Please upload a receipt first.",
        canRetry: false,
      }
    case "not_found":
      return {
        title: "Receipt not found",
        description: "We couldn't find a receipt for this link. Try uploading it again.",
        canRetry: false,
      }
    case "network":
      return {
        title: "Connection error",
        description: "Could not load items from the server. Check your connection and try again.",
        canRetry: true,
      }
    case "server":
      return {
        title: "Something went wrong",
        description: error.message || "We couldn't load items for this receipt. Please try again.",
        canRetry: true,
      }
  }
}

function getSaveErrorContent(error: SaveError): {
  title: string
  description: string
  canRetry: boolean
} {
  switch (error.type) {
    case "missing_receipt":
      return {
        title: "Invalid page",
        description: "No receipt ID was found. Please go back and upload a receipt.",
        canRetry: false,
      }
    case "validation":
      return {
        title: "Cannot save yet",
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

function getItemIssues(item: DraftItem): ItemIssue[] {
  const issues: ItemIssue[] = []

  const name = (item.name ?? "").trim()
  if (!name) {
    issues.push({
      type: "missing_name",
      message: "Item name is missing or blank.",
    })
  }

  const quantity =
    typeof item.quantity === "number" && !Number.isNaN(item.quantity)
      ? item.quantity
      : null

  if (quantity === null || quantity <= 0) {
    issues.push({
      type: "invalid_quantity",
      message: "Quantity should be at least 1.",
    })
  }

  if (!item.categoryId) {
    issues.push({
      type: "missing_category",
      message: "Category has not been set.",
    })
  }

  if (
    typeof item.confidence === "number" &&
    !Number.isNaN(item.confidence) &&
    item.confidence < LOW_CONFIDENCE_THRESHOLD
  ) {
    issues.push({
      type: "low_confidence",
      message: "Low scan confidence — please double-check this item.",
    })
  }

  return issues
}

function hasBlockingIssues(issues: ItemIssue[]): boolean {
  return issues.some((issue) =>
    issue.type === "missing_name" ||
    issue.type === "invalid_quantity" ||
    issue.type === "missing_category"
  )
}

async function saveReviewedItems(
  receiptId: string,
  selectedItemIds: string[],
): Promise<{ error: SaveError | null; savedCount: number }> {
  let response: Response

  try {
    response = await fetch(`/api/receipts/${receiptId}/review`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ selectedItemIds }),
    })
  } catch {
    return { error: { type: "network" }, savedCount: 0 }
  }

  if (response.ok) {
    const data = await response.json().catch(() => null)
    const rawSavedCount = data?.savedCount
    const savedCount =
      typeof rawSavedCount === "number" && Number.isFinite(rawSavedCount)
        ? Math.max(0, Math.floor(rawSavedCount))
        : selectedItemIds.length

    return { error: null, savedCount }
  }

  const data = await response.json().catch(() => null)
  const message = data?.error || "An unexpected error occurred."

  if (response.status === 400) return { error: { type: "validation", message }, savedCount: 0 }
  if (response.status === 422) return { error: { type: "category_missing", message }, savedCount: 0 }
  return { error: { type: "server", message }, savedCount: 0 }
}

export default function ReviewPage() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const receiptId = searchParams.get("receiptId")

  const [fetchStatus, setFetchStatus] = useState<FetchStatus>("idle")
  const [loadError, setLoadError] = useState<LoadError | null>(null)
  const [reloadKey, setReloadKey] = useState(0)
  const [receipt, setReceipt] = useState<ReceiptReviewResponse | null>(null)
  const [selectedItemIds, setSelectedItemIds] = useState<Set<string>>(
    () => new Set(),
  )
  const [saving, setSaving] = useState(false)
  const [saveError, setSaveError] = useState<SaveError | null>(null)

  const hasLoadError = fetchStatus === "error" && loadError
  const canConfirm =
    fetchStatus === "success" &&
    !hasLoadError &&
    !!receipt &&
    receipt.draftItems.length > 0

  useEffect(() => {
    if (!receiptId) {
      setFetchStatus("error")
      setLoadError({ type: "missing_receipt" })
      setReceipt(null)
      setSelectedItemIds(new Set())
      return
    }

    let cancelled = false

    async function load() {
      setFetchStatus("loading")
      setLoadError(null)

      try {
        const response = await fetch(`/api/receipts/${receiptId}/review`)

        if (cancelled) return

        if (response.status === 404) {
          setFetchStatus("error")
          setLoadError({ type: "not_found" })
          setReceipt(null)
          setSelectedItemIds(new Set())
          return
        }

        if (!response.ok) {
          const data = await response.json().catch(() => null)
          setFetchStatus("error")
          setLoadError({
            type: "server",
            message: data?.error,
          })
          setReceipt(null)
          setSelectedItemIds(new Set())
          return
        }

        const data = await response.json().catch(() => null)

        if (!data || typeof data !== "object") {
          setFetchStatus("error")
          setLoadError({
            type: "server",
            message: "Received an invalid response from the server.",
          })
          setReceipt(null)
          setSelectedItemIds(new Set())
          return
        }

        const items = mapDraftItems(
          (data as { draftItems?: unknown }).draftItems,
        )

        const rawId = (data as { id?: unknown }).id
        const resolvedId: string =
          typeof rawId === "string" && rawId
            ? rawId
            : receiptId ?? ""

        const receiptData: ReceiptReviewResponse = {
          id: resolvedId,
          ocrStatus:
            typeof (data as { ocrStatus?: unknown }).ocrStatus === "string"
              ? (data as { ocrStatus?: string }).ocrStatus!
              : "UNKNOWN",
          imagePath:
            typeof (data as { imagePath?: unknown }).imagePath === "string"
              ? (data as { imagePath?: string }).imagePath!
              : null,
          draftItems: items,
        }

        setReceipt(receiptData)

        if (items.length === 0) {
          setFetchStatus("empty")
          setSelectedItemIds(new Set())
        } else {
          setFetchStatus("success")
          setSelectedItemIds(
            new Set(
              items
                .filter((item) => item.isSelected !== false)
                .map((item) => item.id),
            ),
          )
        }
      } catch {
        if (cancelled) return
        setFetchStatus("error")
        setLoadError({ type: "network" })
        setReceipt(null)
        setSelectedItemIds(new Set())
      }
    }

    load()

    return () => {
      cancelled = true
    }
  }, [receiptId, reloadKey])

  const itemsNeedingReview = useMemo(() => {
    if (!receipt) return 0
    return receipt.draftItems.reduce((count, item) => {
      const issues = getItemIssues(item)
      return issues.length > 0 ? count + 1 : count
    }, 0)
  }, [receipt])

  const selectedCount = selectedItemIds.size
  const totalItems = receipt?.draftItems.length ?? 0

  function toggleItemSelection(id: string, checked: boolean) {
    setSelectedItemIds((prev) => {
      const next = new Set(prev)
      if (checked) {
        next.add(id)
      } else {
        next.delete(id)
      }
      return next
    })
  }

  async function handleConfirm() {
    if (!receiptId) {
      setSaveError({ type: "missing_receipt" })
      return
    }

    if (!receipt || receipt.draftItems.length === 0) {
      setSaveError({
        type: "validation",
        message: "There are no items to save for this receipt.",
      })
      return
    }

    const selectedIds = receipt.draftItems
      .filter((item) => selectedItemIds.has(item.id))
      .map((item) => item.id)

    if (selectedIds.length === 0) {
      setSaveError({
        type: "validation",
        message: "Please select at least one item to save.",
      })
      return
    }

    const itemsWithBlockingIssues = receipt.draftItems.filter((item) => {
      if (!selectedItemIds.has(item.id)) return false
      const issues = getItemIssues(item)
      return hasBlockingIssues(issues)
    })

    if (itemsWithBlockingIssues.length > 0) {
      setSaveError({
        type: "validation",
        message:
          "Some selected items still need review. Fix items marked as “Needs review” or deselect them before saving.",
      })
      return
    }

    setSaving(true)
    setSaveError(null)

    const result = await saveReviewedItems(receiptId, selectedIds)

    if (result.error) {
      setSaveError(result.error)
      setSaving(false)
      return
    }

    router.push(`/food-list?saved=1&count=${result.savedCount}`)
  }

  function handleRetryLoad() {
    if (!receiptId) return
    setReloadKey((key) => key + 1)
  }

  const loadErrorContent = loadError ? getLoadErrorContent(loadError) : null
  const saveErrorContent = saveError ? getSaveErrorContent(saveError) : null

  const isLoading = fetchStatus === "loading" || fetchStatus === "idle"
  const disableConfirm = saving || !canConfirm

  return (
    <div className="flex flex-col gap-4">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">
          Review Extracted Items
        </h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Make sure only the correct items from your receipt are saved to your
          food list.
        </p>
      </div>

      {loadErrorContent && (
        <Alert variant="destructive" data-testid="load-error">
          <AlertCircle className="h-4 w-4" />
          <AlertTitle>{loadErrorContent.title}</AlertTitle>
          <AlertDescription className="flex flex-col gap-2">
            <span>{loadErrorContent.description}</span>
            {loadError?.type === "missing_receipt" && (
              <Button
                variant="outline"
                size="sm"
                className="w-fit"
                onClick={() => router.push("/scan")}
              >
                Go to scan
              </Button>
            )}
            {loadErrorContent.canRetry && (
              <Button
                variant="outline"
                size="sm"
                className="w-fit"
                onClick={handleRetryLoad}
                disabled={isLoading}
              >
                Try again
              </Button>
            )}
          </AlertDescription>
        </Alert>
      )}

      {saveErrorContent && !loadErrorContent && (
        <Alert variant="destructive" data-testid="save-error">
          <AlertCircle className="h-4 w-4" />
          <AlertTitle>{saveErrorContent.title}</AlertTitle>
          <AlertDescription className="flex flex-col gap-2">
            <span>{saveErrorContent.description}</span>
            {saveErrorContent.canRetry && (
              <Button
                variant="outline"
                size="sm"
                className="w-fit"
                onClick={handleConfirm}
                disabled={disableConfirm}
              >
                Try again
              </Button>
            )}
          </AlertDescription>
        </Alert>
      )}

      {isLoading && !loadErrorContent && (
        <div className="flex items-center gap-2 text-sm text-muted-foreground">
          <Loader2 className="h-4 w-4 animate-spin" />
          <span>Loading items from your receipt…</span>
        </div>
      )}

      {(fetchStatus === "success" || fetchStatus === "empty") && receipt && (
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Extracted items</CardTitle>
            <CardDescription>
              Uncheck items that look incorrect or incomplete. Items marked as{" "}
              <span className="font-medium">Needs review</span> should be fixed
              or deselected before you continue.
            </CardDescription>
          </CardHeader>
          <CardContent className="flex flex-col gap-3">
            {receipt.draftItems.length === 0 ? (
              receipt.ocrStatus === "PENDING" ? (
                <p
                  className="text-sm text-muted-foreground"
                  data-testid="ocr-pending"
                >
                  We&apos;re still processing your receipt. Items will appear
                  here once the scan is complete.
                </p>
              ) : (
                <p className="text-sm text-muted-foreground">
                  No items were detected from this receipt. You can go back and
                  try uploading a clearer photo, or add items manually from the
                  Manual Entry page.
                </p>
              )
            ) : (
              <>
                <div className="flex items-center justify-between text-xs text-muted-foreground">
                  <span>
                    {selectedCount} of {totalItems} items selected
                  </span>
                  {itemsNeedingReview > 0 && (
                    <span>
                      {itemsNeedingReview}{" "}
                      {itemsNeedingReview === 1 ? "item needs" : "items need"}{" "}
                      review
                    </span>
                  )}
                </div>

                <div className="flex flex-col gap-2">
                  {receipt.draftItems.map((item) => {
                    const issues = getItemIssues(item)
                    const blocking = hasBlockingIssues(issues)
                    const isSelected = selectedItemIds.has(item.id)
                    const displayName =
                      (item.name ?? "").trim() || "(Unnamed item)"
                    const quantity =
                      typeof item.quantity === "number" &&
                        !Number.isNaN(item.quantity)
                        ? item.quantity
                        : null

                    return (
                      <div
                        key={item.id}
                        className="flex flex-col gap-2 rounded-lg border bg-card px-3 py-2 sm:flex-row sm:items-start sm:justify-between"
                        data-testid="draft-item"
                      >
                        <div className="flex items-start gap-3">
                          <Checkbox
                            checked={isSelected}
                            onCheckedChange={(checked) =>
                              toggleItemSelection(item.id, checked === true)
                            }
                            aria-label={`Select ${displayName}`}
                          />
                          <div className="flex flex-col gap-1">
                            <div className="flex flex-wrap items-center gap-2">
                              <span className="text-sm font-medium text-foreground">
                                {displayName}
                              </span>
                              {issues.length > 0 && (
                                <Badge
                                  variant={blocking ? "destructive" : "secondary"}
                                  className="text-[10px]"
                                >
                                  Needs review
                                </Badge>
                              )}
                              {typeof item.confidence === "number" &&
                                !Number.isNaN(item.confidence) && (
                                  <Badge
                                    variant="outline"
                                    className="text-[10px]"
                                  >
                                    {Math.round(item.confidence * 100)}%
                                    {" confidence"}
                                  </Badge>
                                )}
                            </div>
                            <div className="flex flex-wrap gap-x-4 text-xs text-muted-foreground">
                              <span>
                                Qty: {quantity !== null ? quantity : "Unknown"}
                              </span>
                              <span>
                                Category:{" "}
                                {item.categoryId ? "Set" : "Not set"}
                              </span>
                            </div>
                            {issues.length > 0 && (
                              <ul className="mt-1 list-disc space-y-0.5 pl-4 text-xs text-warning-foreground">
                                {issues.map((issue) => (
                                  <li key={issue.type}>{issue.message}</li>
                                ))}
                              </ul>
                            )}
                          </div>
                        </div>
                      </div>
                    )
                  })}
                </div>
              </>
            )}
          </CardContent>
        </Card>
      )}

      <div className="flex flex-col gap-2">
        <Button
          onClick={handleConfirm}
          disabled={disableConfirm}
          className="w-fit"
        >
          {saving && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
          Confirm items
        </Button>
        <p className="text-xs text-muted-foreground">
          We&apos;ll save only the selected items to your food list. You can
          add other items later from Manual Entry.
        </p>
      </div>
    </div>
  )
}
