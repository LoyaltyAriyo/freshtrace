import { prisma } from "@/lib/prisma"

type Params = { params: Promise<{ id: string }> }

export async function POST(_request: Request, { params }: Params) {
  const { id } = await params

  if (!id) {
    return Response.json({ error: "Item ID is required." }, { status: 400 })
  }

  const existing = await prisma.foodItem.findUnique({
    where: { id },
    select: {
      id: true,
      name: true,
      quantity: true,
      categoryId: true,
      source: true,
      receiptId: true,
      status: true,
    },
  })

  if (!existing) {
    return Response.json({ error: "Item not found." }, { status: 404 })
  }

  if (existing.status === "USED") {
    return Response.json({ id: existing.id, status: existing.status, changed: false })
  }

  if (existing.status !== "ACTIVE") {
    return Response.json(
      { error: "Only active items can be marked as used." },
      { status: 409 }
    )
  }

  try {
    const [updated] = await prisma.$transaction([
      prisma.foodItem.update({
        where: { id },
        data: {
          status: "USED",
        },
        select: {
          id: true,
          status: true,
        },
      }),
      prisma.usedItem.upsert({
        where: {
          foodItemId: existing.id,
        },
        create: {
          foodItemId: existing.id,
          name: existing.name,
          quantity: existing.quantity,
          categoryId: existing.categoryId,
          source: existing.source,
          receiptId: existing.receiptId,
        },
        update: {
          name: existing.name,
          quantity: existing.quantity,
          categoryId: existing.categoryId,
          source: existing.source,
          receiptId: existing.receiptId,
          markedUsedAt: new Date(),
        },
        select: {
          id: true,
        },
      }),
    ])

    return Response.json({ id: updated.id, status: updated.status, changed: true })
  } catch (error) {
    console.error("Failed to mark item as used:", error)
    return Response.json(
      { error: "Failed to mark item as used. Please try again." },
      { status: 500 }
    )
  }
}
