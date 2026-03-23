import { prisma } from "@/lib/prisma"

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
  }
}

function toPriority(dateAdded: Date): ItemPriority {
  const ageInDays =
    (Date.now() - new Date(dateAdded).getTime()) / (1000 * 60 * 60 * 24)

  if (ageInDays >= 7) return "use-first"
  if (ageInDays >= 3) return "use-soon"
  return "use-later"
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

export async function GET() {
  try {
    const items = (await prisma.foodItem.findMany({
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
        category: {
          select: {
            name: true,
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
      priority: toPriority(item.dateAdded),
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
