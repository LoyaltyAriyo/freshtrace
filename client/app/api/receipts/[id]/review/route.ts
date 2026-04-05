import { prisma } from "@/lib/prisma"
import { ensureCategories } from "@/lib/category-utils"
import { getCurrentUserId } from "@/lib/auth"

type Params = { params: Promise<{ id: string }> }
type EditedItemInput = {
  id: string
  name: string
  quantity: number
  categoryId: string
}

type AddedItemInput = {
  name: string
  quantity: number
  categoryId: string
}

type ReceiptDraftItem = {
  id: string
  name: string
  quantity: number
  categoryId: string | null
  isSelected: boolean
}

type ReviewCategory = {
  id: string
  name: string
}

type ReviewCategoryId = {
  id: string
}

export async function GET(request: Request, { params }: Params) {
  const { id } = await params

  const userId = await getCurrentUserId(request)

  if (!userId) {
    return Response.json(
      { error: "You must be signed in to review receipts." },
      { status: 401 }
    )
  }

  const receipt = await prisma.receipt.findUnique({
    where: { id },
    select: {
      id: true,
      ocrStatus: true,
      imagePath: true,
      userId: true,
      draftItems: {
        select: {
          id: true,
          name: true,
          quantity: true,
          categoryId: true,
          confidence: true,
          isSelected: true,
        },
      },
    },
  })

  if (!receipt || receipt.userId !== userId) {
    return Response.json({ error: "Receipt not found." }, { status: 404 })
  }

  const categories = await ensureCategories(prisma.category)

  return Response.json({
    ...receipt,
    categories: (categories as ReviewCategory[]).map((category) => ({
      id: category.id,
      name: category.name,
    })),
  })
}

export async function POST(request: Request, { params }: Params) {
  const { id } = await params

  const userId = await getCurrentUserId(request)

  if (!userId) {
    return Response.json(
      { error: "You must be signed in to save items from a receipt." },
      { status: 401 }
    )
  }

  let body: unknown
  try {
    body = await request.json()
  } catch {
    return Response.json({ error: "Invalid JSON body." }, { status: 400 })
  }

  const { selectedItemIds, editedItems, addedItems } = body as Record<string, unknown>

  if (!Array.isArray(selectedItemIds)) {
    return Response.json(
      { error: "selectedItemIds must be an array." },
      { status: 400 }
    )
  }

  if (!selectedItemIds.every((id) => typeof id === "string")) {
    return Response.json(
      { error: "selectedItemIds must be an array of strings." },
      { status: 400 }
    )
  }

  if (selectedItemIds.length === 0) {
    return Response.json(
      { error: "Please select at least one item to save." },
      { status: 400 }
    )
  }

  if (editedItems !== undefined && !Array.isArray(editedItems)) {
    return Response.json(
      { error: "editedItems must be an array when provided." },
      { status: 400 }
    )
  }

  const editedItemMap = new Map<string, EditedItemInput>()
  if (Array.isArray(editedItems)) {
    for (const rawItem of editedItems) {
      if (!rawItem || typeof rawItem !== "object") {
        return Response.json(
          { error: "Each edited item must be an object." },
          { status: 400 }
        )
      }

      const item = rawItem as Record<string, unknown>
      const itemId = typeof item.id === "string" ? item.id : ""
      const name = typeof item.name === "string" ? item.name.trim() : ""
      const quantity = Number(item.quantity)
      const categoryId = typeof item.categoryId === "string" ? item.categoryId.trim() : ""

      if (!itemId) {
        return Response.json(
          { error: "Edited item id is required." },
          { status: 400 }
        )
      }

      if (!name) {
        return Response.json(
          { error: `Item "${itemId}" has an empty name.` },
          { status: 400 }
        )
      }

      if (!Number.isInteger(quantity) || quantity < 1) {
        return Response.json(
          { error: `Item "${name}" has an invalid quantity.` },
          { status: 400 }
        )
      }

      if (!categoryId) {
        return Response.json(
          { error: `Item "${name}" is missing a category.` },
          { status: 422 }
        )
      }

      editedItemMap.set(itemId, {
        id: itemId,
        name,
        quantity,
        categoryId,
      })
    }
  }

  if (addedItems !== undefined && !Array.isArray(addedItems)) {
    return Response.json(
      { error: "addedItems must be an array when provided." },
      { status: 400 }
    )
  }

  const addedItemsList: AddedItemInput[] = []
  if (Array.isArray(addedItems)) {
    for (const rawItem of addedItems) {
      if (!rawItem || typeof rawItem !== "object") {
        return Response.json(
          { error: "Each added item must be an object." },
          { status: 400 }
        )
      }

      const item = rawItem as Record<string, unknown>
      const name = typeof item.name === "string" ? item.name.trim() : ""
      const quantity = Number(item.quantity)
      const categoryId =
        typeof item.categoryId === "string" ? item.categoryId.trim() : ""

      if (!name) {
        return Response.json(
          { error: "Added items must have a non-empty name." },
          { status: 400 }
        )
      }

      if (!Number.isInteger(quantity) || quantity < 1) {
        return Response.json(
          { error: `Item "${name}" has an invalid quantity.` },
          { status: 400 }
        )
      }

      if (!categoryId) {
        return Response.json(
          {
            error: `Item "${name}" is missing a category.`,
          },
          { status: 422 }
        )
      }

      addedItemsList.push({
        name,
        quantity,
        categoryId,
      })
    }
  }

  const receipt = await prisma.receipt.findUnique({
    where: { id },
    select: {
      id: true,
      userId: true,
      draftItems: {
        select: {
          id: true,
          name: true,
          quantity: true,
          categoryId: true,
          isSelected: true,
        },
      },
    },
  })

  if (!receipt || receipt.userId !== userId) {
    return Response.json({ error: "Receipt not found." }, { status: 404 })
  }

  const selectedDrafts = (receipt.draftItems as ReceiptDraftItem[]).filter((item) =>
    selectedItemIds.includes(item.id)
  )

  const selectedWithEdits = selectedDrafts.map((item) => {
    const edited = editedItemMap.get(item.id)
    return {
      id: item.id,
      name: (edited?.name ?? item.name).trim(),
      quantity: edited?.quantity ?? item.quantity,
      categoryId: edited?.categoryId ?? item.categoryId,
    }
  })

  const itemsToSave = [...selectedWithEdits, ...addedItemsList]

  const invalidName = itemsToSave.find((item) => !item.name)
  if (invalidName) {
    return Response.json(
      { error: "Selected items must have a valid name." },
      { status: 400 }
    )
  }

  const invalidQuantity = itemsToSave.find(
    (item) => !Number.isInteger(item.quantity) || item.quantity < 1
  )
  if (invalidQuantity) {
    return Response.json(
      { error: "Selected items must have a quantity of at least 1." },
      { status: 400 }
    )
  }

  const missingCategory = itemsToSave.find((item) => !item.categoryId)
  if (missingCategory) {
    return Response.json(
      {
        error: `Item "${missingCategory.name}" is missing a category. Please assign one before saving.`,
      },
      { status: 422 }
    )
  }

  const selectedCategoryIds = Array.from(
    new Set(itemsToSave.map((item) => item.categoryId).filter((value): value is string => !!value))
  )

  const categories = await prisma.category.findMany({
    where: {
      id: {
        in: selectedCategoryIds,
      },
    },
    select: {
      id: true,
    },
  })

  const validCategoryIds = new Set(
    (categories as ReviewCategoryId[]).map((category) => category.id)
  )
  const unknownCategory = itemsToSave.find(
    (item) => !item.categoryId || !validCategoryIds.has(item.categoryId)
  )

  if (unknownCategory) {
    return Response.json(
      { error: `Item "${unknownCategory.name}" has an invalid category.` },
      { status: 422 }
    )
  }

  try {
    const result = await prisma.foodItem.createMany({
      data: itemsToSave.map((item) => ({
        name: item.name,
        quantity: item.quantity,
        categoryId: item.categoryId as string,
        source: "RECEIPT" as const,
        receiptId: receipt.id,
        userId,
      })),
    })

    return Response.json({ savedCount: result.count }, { status: 201 })
  } catch (error) {
    console.error("Failed to save food items from review:", error)
    return Response.json(
      { error: "Failed to save items. Please try again." },
      { status: 500 }
    )
  }
}
