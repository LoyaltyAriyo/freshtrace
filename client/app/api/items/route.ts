import { prisma } from "@/lib/prisma"

type ItemPriority = "use-first" | "use-soon" | "use-later"

function toPriority(dateAdded: Date): ItemPriority {
  const ageInDays =
    (Date.now() - new Date(dateAdded).getTime()) / (1000 * 60 * 60 * 24)

  if (ageInDays >= 7) return "use-first"
  if (ageInDays >= 3) return "use-soon"
  return "use-later"
}

export async function GET() {
  try {
    const items = await prisma.foodItem.findMany({
      where: {
        status: "ACTIVE",
      },
      orderBy: {
        dateAdded: "desc",
      },
      select: {
        id: true,
        name: true,
        quantity: true,
        dateAdded: true,
        status: true,
        category: {
          select: {
            name: true,
          },
        },
      },
    })

    const payload = items.map((item) => ({
      id: item.id,
      name: item.name,
      quantity: item.quantity,
      dateAdded: item.dateAdded,
      status: item.status,
      categoryName: item.category.name,
      priority: toPriority(item.dateAdded),
    }))

    return Response.json(payload)
  } catch (error) {
    console.error("Failed to fetch food items:", error)
    return Response.json(
      { error: "Failed to load food items. Please try again." },
      { status: 500 }
    )
  }
}

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
