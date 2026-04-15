import { prisma } from "@/lib/prisma"
import { getCurrentUserId } from "@/lib/auth"
import { calculatePriority } from "@/lib/priority"

type ItemPriority = "use-first" | "use-soon" | "use-later"
type CategoryKey = "produce" | "dairy" | "meat" | "leftovers" | "pantry" | "other"

type PrioritizedItem = {
  id: string
  name: string
  category: CategoryKey
  quantity: string
  addedDate: string
  priority: ItemPriority
  status: "active"
}

type RawPrioritizedItem = {
  id: string
  name: string
  quantity: number
  dateAdded: Date
  category: {
    name: string
    shelfLifeDays: number
  }
}

function toCategoryKey(value: string): CategoryKey {
  const normalized = value.trim().toLowerCase()
  if (
    normalized === "produce" ||
    normalized === "dairy" ||
    normalized === "meat" ||
    normalized === "leftovers" ||
    normalized === "pantry" ||
    normalized === "other"
  ) {
    return normalized
  }

  return "other"
}

export async function GET(request: Request) {
  try {
    const userId = await getCurrentUserId(request)

    if (!userId) {
      return Response.json(
        { error: "You must be signed in to view prioritized items." },
        { status: 401 }
      )
    }

    const items = (await prisma.foodItem.findMany({
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
        category: {
          select: {
            name: true,
            shelfLifeDays: true,
          },
        },
      },
    })) as RawPrioritizedItem[]

    const prioritizedItems: PrioritizedItem[] = items.map((item) => ({
      id: item.id,
      name: item.name,
      category: toCategoryKey(item.category.name),
      quantity: String(item.quantity),
      addedDate: item.dateAdded.toISOString(),
      priority: calculatePriority(item.dateAdded, item.category.shelfLifeDays) as ItemPriority,
      status: "active",
    }))

    return Response.json({
      items: prioritizedItems,
      useFirst: prioritizedItems.filter((item) => item.priority === "use-first"),
      useSoon: prioritizedItems.filter((item) => item.priority === "use-soon"),
      useLater: prioritizedItems.filter((item) => item.priority === "use-later"),
    })
  } catch (error) {
    console.error("Failed to fetch prioritized items:", error)
    return Response.json(
      { error: "Failed to load prioritized items. Please try again." },
      { status: 500 }
    )
  }
}
