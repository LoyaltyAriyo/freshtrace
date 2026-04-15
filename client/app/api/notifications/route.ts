import { prisma } from "@/lib/prisma"
import { buildNotification } from "@/lib/notifications"

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

    const notifications = items
      .map((item) =>
        buildNotification({
          id: item.id,
          name: item.name,
          dateAdded: item.dateAdded,
          categoryName: item.category.name,
        })
      )
      .filter((n) => n !== null)

    return Response.json({ notifications, count: notifications.length })
  } catch (error) {
    console.error("Failed to fetch notifications:", error)
    return Response.json(
      { error: "Failed to fetch notifications. Please try again." },
      { status: 500 }
    )
  }
}
