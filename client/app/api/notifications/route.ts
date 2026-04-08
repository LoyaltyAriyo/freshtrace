import { prisma } from "@/lib/prisma"

const CATEGORY_SHELF_LIFE: Record<string, number> = {
  Produce: 7,
  Meat: 3,
  Seafood: 2,
  Dairy: 10,
  Bakery: 5,
  Frozen: 90,
  Pantry: 60,
  Beverage: 30,
  Snacks: 45,
  Leftover: 3,
  Other: 14,
}

function getDaysStored(dateAdded: Date): number {
  return Math.floor((Date.now() - new Date(dateAdded).getTime()) / (1000 * 60 * 60 * 24))
}

function getShelfLife(categoryName: string): number {
  return CATEGORY_SHELF_LIFE[categoryName] ?? 7
}

function getDaysLeft(dateAdded: Date, categoryName: string): number {
  const stored = getDaysStored(dateAdded)
  const shelfLife = getShelfLife(categoryName)
  return Math.max(0, shelfLife - stored)
}

export async function GET() {
  try {
    const items = await prisma.foodItem.findMany({
      where: { status: "ACTIVE" },
      select: {
        id: true,
        name: true,
        dateAdded: true,
        category: { select: { name: true } },
      },
    })

    const notifications = []

    for (const item of items) {
      const categoryName = item.category.name
      const daysLeft = getDaysLeft(item.dateAdded, categoryName)
      const shelfLife = getShelfLife(categoryName)

      if (daysLeft === 0) {
        notifications.push({
          id: `expired-${item.id}`,
          message: `${item.name} has expired — please discard it.`,
          timestamp: new Date().toISOString(),
          type: "warning",
          read: false,
        })
      } else if (daysLeft <= Math.ceil(shelfLife * 0.25)) {
        notifications.push({
          id: `use-first-${item.id}`,
          message: `${item.name} should be used soon — only ${daysLeft} day${daysLeft === 1 ? "" : "s"} left.`,
          timestamp: new Date().toISOString(),
          type: "reminder",
          read: false,
        })
      } else if (daysLeft <= Math.ceil(shelfLife * 0.5)) {
        notifications.push({
          id: `use-soon-${item.id}`,
          message: `${item.name} is approaching its use-by period — ${daysLeft} days left.`,
          timestamp: new Date().toISOString(),
          type: "info",
          read: false,
        })
      }
    }

    return Response.json({ notifications, count: notifications.length })
  } catch (error) {
    console.error("Failed to fetch notifications:", error)
    return Response.json(
      { error: "Failed to fetch notifications. Please try again." },
      { status: 500 }
    )
  }
}
