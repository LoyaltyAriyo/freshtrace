export const runtime = "nodejs"
// Match the existing deployment limit; OCR stops well before it.
export const maxDuration = 300
import { withinDeadline } from "@/lib/ocr-worker"
import { prisma } from "@/lib/prisma"
import { ensureCategories, findCategoryIdForItemName } from "@/lib/category-utils"
import {
  extractReceiptDraftItems,
  type OcrExtractionResult,
  type OcrOutcomeStatus,
} from "@/lib/ocr"
import { supabaseAdmin } from "@/lib/supabase/server"
import { getCurrentUserId } from "@/lib/auth"
import { logError } from "@/lib/logger"
import { MAX_RECEIPT_FILE_BYTES, RECEIPT_IMAGE_TYPES, RECEIPT_SIZE_ERROR, RECEIPT_TYPE_ERROR } from "@/lib/receipt-upload"


const RECEIPTS_BUCKET = "receipts"

type PersistedOcrStatus = "PENDING" | "SUCCESS" | "FAILED" | "FALLBACK_USED"

function getPersistedOcrStatus(outcome: OcrOutcomeStatus): PersistedOcrStatus {
  switch (outcome) {
    case "DISABLED":
      return "PENDING"
    case "NO_ITEMS":
    case "SUCCESS":
      return "SUCCESS"
    case "FALLBACK_USED":
      return "FALLBACK_USED"
    case "FAILED":
      return "FAILED"
  }
}

function buildReceiptObjectPath(file: File, requestId: string) {
  const extension = file.type === "image/png" ? "png" : file.type === "image/webp" ? "webp" : file.type === "image/heic" ? "heic" : file.type === "image/heif" ? "heif" : "jpg"
  return `uploads/${requestId}.${extension}`
}

async function downloadReceiptObjectBytes(objectPath: string): Promise<Uint8Array | null> {
  const { data, error } = await supabaseAdmin.storage
    .from(RECEIPTS_BUCKET)
    .download(objectPath)

  if (error || !data) {
    await withinDeadline(logError({
      message: "Failed to download receipt image from storage.",
      errorType: "RECEIPT_STORAGE_DOWNLOAD_FAILED",
      source: "API",
      details: { objectPath, bucket: RECEIPTS_BUCKET },
    }), 1_000).catch(() => undefined)
    return null
  }

  const arrayBuffer = await data.arrayBuffer()
  return new Uint8Array(arrayBuffer)
}

export async function POST(request: Request) {
  const started = Date.now()
  const suppliedId = request.headers.get("x-receipt-request-id")
  if (suppliedId && !/^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(suppliedId)) {
    return Response.json({ error: "Invalid upload request ID." }, { status: 400 })
  }
  const requestId = suppliedId ?? crypto.randomUUID()
  let stage = "AUTHENTICATION"
  const mark = (next: string) => {
    stage = next
    console.info(JSON.stringify({ event: "receipt_upload", requestId, stage, elapsedMs: Date.now() - started }))
  }
  mark(stage)
  try {
    const userId = await getCurrentUserId(request)

    if (!userId) {
      return Response.json(
        { error: "You must be signed in to upload receipts." },
        { status: 401 }
      )
    }

    mark("AUTHENTICATED")
    if (suppliedId) {
      const existing = await prisma.receipt.findUnique({ where: { id: requestId }, select: { id: true, userId: true, ocrStatus: true } })
      if (existing) {
        if (existing.userId !== userId) return Response.json({ error: "Upload request ID already used." }, { status: 409 })
        return Response.json({ receiptId: existing.id, ocrStatus: existing.ocrStatus }, { status: 200 })
      }
    }
    const formData = await request.formData()
    const entry = formData.get("receipt")

    if (!entry || typeof entry === "string") {
      return Response.json(
        { error: "No receipt file uploaded." },
        { status: 400 }
      )
    }

    const file = entry as File
    if (!RECEIPT_IMAGE_TYPES.has(file.type)) {
      return Response.json(
        { error: RECEIPT_TYPE_ERROR },
        { status: 400 }
      )
    }

    if (file.size > MAX_RECEIPT_FILE_BYTES) {
      return Response.json(
        { error: RECEIPT_SIZE_ERROR },
        { status: 413 }
      )
    }

    const objectPath = buildReceiptObjectPath(file, requestId)

    const arrayBuffer = await file.arrayBuffer()
    const fileBytes = new Uint8Array(arrayBuffer)

    mark("VALIDATED")
    const { error: uploadError } = await supabaseAdmin.storage
      .from(RECEIPTS_BUCKET)
      .upload(objectPath, fileBytes, {
        contentType: file.type || "application/octet-stream",
        upsert: false,
      })

    if (uploadError) {
      await withinDeadline(logError({
        message: "Failed to upload receipt image to storage.",
        errorType: "RECEIPT_STORAGE_UPLOAD_FAILED",
        source: "API",
        details: { objectPath, bucket: RECEIPTS_BUCKET, mimeType: file.type || null },
      }), 1_000).catch(() => undefined)
      return Response.json(
        { error: "Failed to store receipt image." },
        { status: 500 }
      )
    }

    mark("STORED")
    let savedReceiptId: string | undefined
    try {
      const receipt = await prisma.receipt.create({
        data: {
          id: requestId,
          imagePath: objectPath,
          ocrStatus: "PENDING",
          userId,
        },
        select: {
          id: true,
        },
      })

      savedReceiptId = receipt.id
      mark("RECEIPT_CREATED")
      let finalStatus: PersistedOcrStatus = "FAILED"
      let ocrOutcome: OcrOutcomeStatus = "FAILED"
      const storedImageBytes = await downloadReceiptObjectBytes(objectPath)

      if (storedImageBytes) {
        mark("DOWNLOADED")
        let extraction: OcrExtractionResult

        try {
          extraction = await extractReceiptDraftItems(storedImageBytes, {
            deadline: Math.min(Date.now() + 60_000, started + 75_000),
            onStage: (ocrStage) => mark(`OCR_${ocrStage}`),
          })
        } catch {
          extraction = {
            status: "FAILED",
            items: [],
            fallbackUsed: false,
            failure: {
              stage: "INITIALIZATION",
              category: "OCR_UNEXPECTED_FAILURE",
            },
          }
        }

        mark(`OCR_${extraction.status}`)
        ocrOutcome = extraction.status
        finalStatus = getPersistedOcrStatus(extraction.status)

        if (extraction.status === "FAILED") {
          const failure = extraction.failure
          console.info(JSON.stringify({ event: "receipt_ocr_failure", requestId, ...failure, elapsedMs: Date.now() - started }))
          await withinDeadline(logError({
            message: "Receipt OCR processing failed.",
            errorType: "OCR_FAILURE",
            source: "OCR",
            severity: "WARNING",
            details: {
              receiptId: receipt.id,
              objectPath,
              stage: failure?.stage ?? "INITIALIZATION",
              errorCategory: failure?.category ?? "OCR_UNKNOWN_FAILURE",
              terminationFailed: failure?.terminationFailed ?? false,
            },
          }), 1_000).catch(() => undefined)
        } else if (extraction.items.length > 0) {
          const categories = await ensureCategories(prisma.category)
          await prisma.receiptItemDraft.createMany({
            data: extraction.items.map((item) => ({
              receiptId: receipt.id,
              name: item.name,
              quantity: item.quantity,
              categoryId: findCategoryIdForItemName(item.name, categories),
              confidence: item.confidence,
              isSelected: true,
            })),
          })
        }
      }

      if (!storedImageBytes) {
        ocrOutcome = "FAILED"
      }

      await prisma.receipt.update({
        where: { id: receipt.id },
        data: {
          ocrStatus: finalStatus,
        },
      })

      mark("COMPLETED")
      return Response.json(
        { receiptId: receipt.id, ocrStatus: finalStatus, ocrOutcome },
        { status: 201 }
      )
    } catch {
      await withinDeadline(logError({
        message: "Failed to save or process receipt record.",
        errorType: "RECEIPT_RECORD_CREATE_FAILED",
        source: "DB",
        details: { requestId, stage },
      }), 1_000).catch(() => undefined)

      if (!savedReceiptId) {
        // A failed create response can be ambiguous; check before deleting data.
        try {
          const existing = await withinDeadline(prisma.receipt.findUnique({ where: { id: requestId }, select: { id: true, userId: true } }), 3_000)
          if (existing?.userId === userId) savedReceiptId = existing.id
        } catch {
          return Response.json({ error: "The upload could not be confirmed. Check the saved receipt before uploading again." }, { status: 500 })
        }
      }
      if (savedReceiptId) {
        // A saved receipt must retain its image even when saving drafts fails.
        await withinDeadline(prisma.receipt.update({ where: { id: savedReceiptId }, data: { ocrStatus: "FAILED" } }), 3_000).catch(() => undefined)
        mark("SAVE_FAILED")
        return Response.json({ receiptId: savedReceiptId, ocrStatus: "FAILED", error: "Your receipt was saved, but processing failed. Open it to review or enter items manually." }, { status: 500 })
      }
      const { error: removeError } = await supabaseAdmin.storage
        .from(RECEIPTS_BUCKET)
        .remove([objectPath])

      if (removeError) {
        await withinDeadline(logError({
          message: "Failed to clean up receipt image after receipt save error.",
          errorType: "RECEIPT_STORAGE_CLEANUP_FAILED",
          source: "API",
          severity: "WARNING",
          details: { objectPath, bucket: RECEIPTS_BUCKET },
        }), 1_000).catch(() => undefined)
      }

      return Response.json(
        { error: "Failed to process receipt upload." },
        { status: 500 }
      )
    }
  } catch {
    await withinDeadline(logError({
      message: "Error handling receipt upload.",
      errorType: "RECEIPT_UPLOAD_FAILED",
      source: "API",
      details: { route: "POST /api/receipts", requestId, stage },
    }), 1_000).catch(() => undefined)
    return Response.json(
      { error: "Failed to process receipt upload." },
      { status: 500 }
    )
  }
}
