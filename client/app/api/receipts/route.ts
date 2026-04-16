export const runtime = "nodejs"
import { prisma } from "@/lib/prisma"
import { ensureCategories, findCategoryIdForItemName } from "@/lib/category-utils"
import { extractReceiptDraftItems } from "@/lib/ocr"
import { supabaseAdmin } from "@/lib/supabase/server"
import { getCurrentUserId } from "@/lib/auth"
import { logError } from "@/lib/logger"


const MAX_FILE_SIZE_BYTES = 10 * 1024 * 1024 // 10MB
const RECEIPTS_BUCKET = "receipts"

const ALLOWED_IMAGE_MIME_TYPES = new Set<string>([
  "image/jpeg",
  "image/png",
  "image/heic",
  "image/heif",
  "image/webp",
])

function buildReceiptObjectPath(file: File) {
  const timestamp = Date.now()
  const uuid = crypto.randomUUID()

  const originalName = file.name || "receipt.jpg"

  const safeName = originalName
    .toLowerCase()
    .replace(/[^a-z0-9_.-]/g, "-")
    .replace(/-+/g, "-")
    .slice(0, 64)

  return `uploads/${timestamp}-${uuid}-${safeName}`
}

async function downloadReceiptObjectBytes(objectPath: string): Promise<Uint8Array | null> {
  const { data, error } = await supabaseAdmin.storage
    .from(RECEIPTS_BUCKET)
    .download(objectPath)

  if (error || !data) {
    await logError({
      message: "Failed to download receipt image from storage.",
      error: error ?? new Error("Supabase Storage returned no data."),
      errorType: "RECEIPT_STORAGE_DOWNLOAD_FAILED",
      source: "API",
      details: { objectPath, bucket: RECEIPTS_BUCKET },
    })
    return null
  }

  const arrayBuffer = await data.arrayBuffer()
  return new Uint8Array(arrayBuffer)
}

export async function POST(request: Request) {
  try {
    const userId = await getCurrentUserId(request)

    if (!userId) {
      return Response.json(
        { error: "You must be signed in to upload receipts." },
        { status: 401 }
      )
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
    if (!file.type || !ALLOWED_IMAGE_MIME_TYPES.has(file.type)) {
      return Response.json(
        { error: "Invalid file type. Please upload a JPG, PNG, HEIC, or WebP image." },
        { status: 400 }
      )
    }

    if (file.size > MAX_FILE_SIZE_BYTES) {
      return Response.json(
        { error: "File is too large. Maximum size is 10MB." },
        { status: 400 }
      )
    }

    const objectPath = buildReceiptObjectPath(file)

    const arrayBuffer = await file.arrayBuffer()
    const fileBytes = new Uint8Array(arrayBuffer)

    const { error: uploadError } = await supabaseAdmin.storage
      .from(RECEIPTS_BUCKET)
      .upload(objectPath, fileBytes, {
        contentType: file.type || "application/octet-stream",
        upsert: false,
      })

    if (uploadError) {
      await logError({
        message: "Failed to upload receipt image to storage.",
        error: uploadError,
        errorType: "RECEIPT_STORAGE_UPLOAD_FAILED",
        source: "API",
        details: { objectPath, bucket: RECEIPTS_BUCKET, mimeType: file.type || null },
      })
      return Response.json(
        { error: "Failed to store receipt image." },
        { status: 500 }
      )
    }

    try {
      const receipt = await prisma.receipt.create({
        data: {
          imagePath: objectPath,
          ocrStatus: "PENDING",
          userId,
        },
        select: {
          id: true,
        },
      })

      let finalStatus: "SUCCESS" | "FAILED" | "FALLBACK_USED" = "FAILED"

      try {
        const storedImageBytes = await downloadReceiptObjectBytes(objectPath)

        if (!storedImageBytes) {
          throw new Error("Unable to download receipt image from storage.")
        }

        const extraction = await extractReceiptDraftItems(storedImageBytes)
        const categories = await ensureCategories(prisma.category)

        if (extraction.items.length > 0) {
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

          finalStatus = extraction.fallbackUsed ? "FALLBACK_USED" : "SUCCESS"
        } else {
          finalStatus = "FAILED"
        }
      } catch (ocrError) {
        await logError({
          message: "OCR extraction failed.",
          error: ocrError,
          errorType: "OCR_FAILURE",
          source: "OCR",
          severity: "WARNING",
          details: { receiptId: receipt.id, objectPath },
        })
        finalStatus = "FAILED"
      }

      await prisma.receipt.update({
        where: { id: receipt.id },
        data: {
          ocrStatus: finalStatus,
        },
      })

      return Response.json(
        { receiptId: receipt.id, ocrStatus: finalStatus },
        { status: 201 }
      )
    } catch (dbError) {
      await logError({
        message: "Error creating receipt record.",
        error: dbError,
        errorType: "RECEIPT_RECORD_CREATE_FAILED",
        source: "DB",
        details: { objectPath },
      })

      const { error: removeError } = await supabaseAdmin.storage
        .from(RECEIPTS_BUCKET)
        .remove([objectPath])

      if (removeError) {
        await logError({
          message: "Failed to clean up receipt image after receipt save error.",
          error: removeError,
          errorType: "RECEIPT_STORAGE_CLEANUP_FAILED",
          source: "API",
          severity: "WARNING",
          details: { objectPath, bucket: RECEIPTS_BUCKET },
        })
      }

      return Response.json(
        { error: "Failed to process receipt upload." },
        { status: 500 }
      )
    }
  } catch (error) {
    await logError({
      message: "Error handling receipt upload.",
      error,
      errorType: "RECEIPT_UPLOAD_FAILED",
      source: "API",
      details: { route: "POST /api/receipts" },
    })
    return Response.json(
      { error: "Failed to process receipt upload." },
      { status: 500 }
    )
  }
}
