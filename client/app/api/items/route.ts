import { prisma } from "@/lib/prisma"
import { getCurrentUserId } from "@/lib/auth"
import { calculatePriority } from "@/lib/priority"

type ItemPriority = "use-first" | "use-soon" | "use-later"

type FoodListQueryItem = {
  id: string
  name: string
  quantity: number
  dateAdded: Date
  status: string
  category: {
    id: string
    name: string
    shelfLifeDays: number
  }
}

type CreateFoodItemPayload = {
  name: string
  quantity: number
  categoryId: string
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
      return Response.json(
        { error: "You must be signed in to view food items." },
        { status: 401 }
      )
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
            id: true,
            name: true,
            shelfLifeDays: true,
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
      categoryId: item.category.id,
      categoryName: item.category.name,
      priority: calculatePriority(item.dateAdded, item.category.shelfLifeDays) as ItemPriority,
    }))

    return Response.json(payload)
  } catch (error) {
    console.error("Failed to fetch food items:", error)
    return serverError("Failed to load food items. Please try again.")
  }
}

export async function POST(request: Request) {
  const userId = await getCurrentUserId(request)

  if (!userId) {
    return Response.json(
      { error: "You must be signed in to create food items." },
      { status: 401 }
    )
  }

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
