import { prisma } from "@/lib/prisma"

type Params = { params: Promise<{ id: string }> }

export async function GET(_request: Request, { params }: Params) {
  const { id } = await params

  const receipt = await prisma.receipt.findUnique({
    where: { id },
    select: {
      id: true,
      ocrStatus: true,
      imagePath: true,
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

  if (!receipt) {
    return Response.json({ error: "Receipt not found." }, { status: 404 })
  }

  return Response.json(receipt)
}

export async function POST(request: Request, { params }: Params) {
  const { id } = await params

  let body: unknown
  try {
    body = await request.json()
  } catch {
    return Response.json({ error: "Invalid JSON body." }, { status: 400 })
  }

  const { selectedItemIds } = body as Record<string, unknown>

  if (!Array.isArray(selectedItemIds)) {
    return Response.json(
      { error: "selectedItemIds must be an array." },
      { status: 400 }
    )
  }

  if (selectedItemIds.length === 0) {
    return Response.json(
      { error: "Please select at least one item to save." },
      { status: 400 }
    )
  }

  const receipt = await prisma.receipt.findUnique({
    where: { id },
    select: {
      id: true,
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

  if (!receipt) {
    return Response.json({ error: "Receipt not found." }, { status: 404 })
  }

  const selectedDrafts = receipt.draftItems.filter((item) =>
    selectedItemIds.includes(item.id)
  )

  const missingCategory = selectedDrafts.find((item) => !item.categoryId)
  if (missingCategory) {
    return Response.json(
      {
        error: `Item "${missingCategory.name}" is missing a category. Please assign one before saving.`,
      },
      { status: 422 }
    )
  }

  try {
    const result = await prisma.foodItem.createMany({
      data: selectedDrafts.map((item) => ({
        name: item.name,
        quantity: item.quantity,
        categoryId: item.categoryId as string,
        source: "RECEIPT" as const,
        receiptId: receipt.id,
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
