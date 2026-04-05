import { prisma } from "@/lib/prisma"
import { getCurrentUserId } from "@/lib/auth"

type ItemPriority = "use-first" | "use-soon" | "use-later"

type FoodListQueryItem = {
  id: string
  name: string
  quantity: number
  dateAdded: Date
  status: string
  category: {
    name: string
  }
}

type CreateFoodItemPayload = {
  name: string
  quantity: number
  categoryId: string
}

function toPriority(dateAdded: Date): ItemPriority {
  const ageInDays =
    (Date.now() - new Date(dateAdded).getTime()) / (1000 * 60 * 60 * 24)

  if (ageInDays >= 7) return "use-first"
  if (ageInDays >= 3) return "use-soon"
  return "use-later"
}

function badRequest(message: string) {
  return Response.json({ error: message }, { status: 400 })
}

function serverError(message: string) {
  return Response.json({ error: message }, { status: 500 })
}

export async function GET(request: Request) {
  try {
    const userId = await getCurrentUserId(request)

    if (!userId) {
      return serverError("You must be signed in to view your food list.")
    }

    const items = await prisma.foodItem.findMany({
      where: {
        status: "ACTIVE",
        userId,
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

    const payload = (items as FoodListQueryItem[]).map((item) => ({
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
    return serverError("Failed to load food items. Please try again.")
  }
}

export async function POST(request: Request) {
  let body: unknown
  try {
    body = await request.json()
  } catch {
    return badRequest("Invalid JSON body.")
  }

  const { name, quantity, categoryId } = (body ?? {}) as CreateFoodItemPayload &
    Record<string, unknown>

  if (!name || typeof name !== "string" || !name.trim()) {
    return badRequest("Item name is required.")
  }

  if (!categoryId || typeof categoryId !== "string") {
    return badRequest("Category is required.")
  }

  const parsedQuantity = Number(quantity)
  if (!Number.isInteger(parsedQuantity) || parsedQuantity < 1) {
    return badRequest("Quantity must be a whole number of at least 1.")
  }

  const category = await prisma.category.findUnique({ where: { id: categoryId } })
  if (!category) {
    return Response.json({ error: "Selected category does not exist." }, { status: 422 })
  }

  const userId = await getCurrentUserId(request)

  if (!userId) {
    return serverError("You must be signed in to add items.")
  }

  try {
    const item = await prisma.foodItem.create({
      data: {
        name: name.trim(),
        quantity: parsedQuantity,
        categoryId,
        source: "MANUAL",
        userId,
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
    return serverError("Failed to save item. Please try again.")
  }
}
