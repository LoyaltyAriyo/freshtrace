import { prisma } from "@/lib/prisma"
import { extractReceiptDraftItems } from "@/lib/ocr"
import { supabaseAdmin } from "@/lib/supabase/server"

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

export async function POST(request: Request) {
  try {
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
      console.error("Supabase Storage upload error:", uploadError)
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
        },
        select: {
          id: true,
        },
      })

      let finalStatus: "SUCCESS" | "FAILED" | "FALLBACK_USED" = "FAILED"

      try {
        const extraction = await extractReceiptDraftItems(fileBytes)

        if (extraction.items.length > 0) {
          await prisma.receiptItemDraft.createMany({
            data: extraction.items.map((item) => ({
              receiptId: receipt.id,
              name: item.name,
              quantity: item.quantity,
              confidence: item.confidence,
              isSelected: true,
            })),
          })

          finalStatus = extraction.fallbackUsed ? "FALLBACK_USED" : "SUCCESS"
        } else {
          finalStatus = "FAILED"
        }
      } catch (ocrError) {
        console.error("OCR extraction failed:", ocrError)
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
      console.error("Error creating receipt record:", dbError)

      const { error: removeError } = await supabaseAdmin.storage
        .from(RECEIPTS_BUCKET)
        .remove([objectPath])

      if (removeError) {
        console.error("Supabase Storage cleanup error:", removeError)
      }

      return Response.json(
        { error: "Failed to process receipt upload." },
        { status: 500 }
      )
    }
  } catch (error) {
    console.error("Error handling receipt upload:", error)
    return Response.json(
      { error: "Failed to process receipt upload." },
      { status: 500 }
    )
  }
}
