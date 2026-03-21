import { prisma } from "@/lib/prisma"

export async function POST(request: Request) {
  let body: unknown
  try {
    body = await request.json()
  } catch {
    return Response.json({ error: "Invalid JSON body." }, { status: 400 })
  }

  const { name, quantity, categoryId } = body as Record<string, unknown>

  if (!name || typeof name !== "string" || !name.trim()) {
    return Response.json({ error: "Item name is required." }, { status: 400 })
  }

  if (!categoryId || typeof categoryId !== "string") {
    return Response.json({ error: "Category is required." }, { status: 400 })
  }

  const parsedQuantity = Number(quantity)
  if (!Number.isInteger(parsedQuantity) || parsedQuantity < 1) {
    return Response.json({ error: "Quantity must be a whole number of at least 1." }, { status: 400 })
  }

  const category = await prisma.category.findUnique({ where: { id: categoryId } })
  if (!category) {
    return Response.json({ error: "Selected category does not exist." }, { status: 422 })
  }

  try {
    const item = await prisma.foodItem.create({
      data: {
        name: name.trim(),
        quantity: parsedQuantity,
        categoryId,
        source: "MANUAL",
      },
      select: {
        id: true,
        name: true,
        quantity: true,
        categoryId: true,
      },
    })

    return Response.json(item, { status: 201 })
  } catch (error) {
    console.error("Failed to create food item:", error)
    return Response.json({ error: "Failed to save item. Please try again." }, { status: 500 })
  }
}
