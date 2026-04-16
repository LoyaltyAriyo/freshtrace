import { prisma } from "@/lib/prisma"
import { getCurrentUserId } from "@/lib/auth"
import { buildNotification } from "@/lib/notifications"

function mapNotificationType(type: "INFO" | "REMINDER" | "WARNING") {
  switch (type) {
    case "WARNING":
      return "warning" as const
    case "REMINDER":
      return "reminder" as const
    default:
      return "info" as const
  }
}

export async function GET(request: Request) {
  try {
    const userId = await getCurrentUserId(request)

    if (!userId) {
      return Response.json(
        { error: "You must be signed in to view notifications." },
        { status: 401 }
      )
    }

    const items = await prisma.foodItem.findMany({
      where: {
        status: "ACTIVE",
        userId,
      },
      select: {
        id: true,
        name: true,
        dateAdded: true,
        category: { select: { name: true } },
      },
    })

    const activeItemNotifications = items
      .map((item) =>
        buildNotification({
          id: item.id,
          name: item.name,
          dateAdded: item.dateAdded,
          categoryName: item.category.name,
        })
      )
      .filter((n) => n !== null)

    const persistedNotifications = await prisma.notification.findMany({
      where: { userId },
      orderBy: { createdAt: "desc" },
      select: {
        id: true,
        message: true,
        type: true,
        isRead: true,
        createdAt: true,
      },
    })

    const notifications = [
      ...persistedNotifications.map((notification) => ({
        id: notification.id,
        message: notification.message,
        timestamp: notification.createdAt.toISOString(),
        type: mapNotificationType(notification.type),
        read: notification.isRead,
      })),
      ...activeItemNotifications,
    ].sort(
      (left, right) =>
        new Date(right.timestamp).getTime() - new Date(left.timestamp).getTime()
    )

    return Response.json({ notifications, count: notifications.length })
  } catch (error) {
    console.error("Failed to fetch notifications:", error)
    return Response.json(
      { error: "Failed to fetch notifications. Please try again." },
      { status: 500 }
    )
  }
}
