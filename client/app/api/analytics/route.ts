import { prisma } from "@/lib/prisma"

function getDateFrom(range: string): Date | null {
  const now = new Date()
  if (range === "today") {
    const start = new Date(now)
    start.setHours(0, 0, 0, 0)
    return start
  }
  if (range === "7d") {
    const start = new Date(now)
    start.setDate(start.getDate() - 7)
    return start
  }
  if (range === "30d") {
    const start = new Date(now)
    start.setDate(start.getDate() - 30)
    return start
  }
  return null
}

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url)
    const range = searchParams.get("range") ?? "7d"
    const dateFrom = getDateFrom(range)

    const dateFilter = dateFrom ? { gte: dateFrom } : undefined

    const [
      activeUsers,
      totalReceipts,
      activeFoodItems,
      wastedItems,
      usedItems,
      topCategories,
    ] = await Promise.all([
      prisma.user.count({
        where: {
          accountStatus: "ACTIVE",
          ...(dateFilter ? { createdAt: dateFilter } : {}),
        },
      }),
      prisma.receipt.count({
        where: dateFilter ? { uploadedAt: dateFilter } : {},
      }),
      prisma.foodItem.count({
        where: {
          status: "ACTIVE",
          ...(dateFilter ? { dateAdded: dateFilter } : {}),
        },
      }),
      prisma.wastedItem.count({
        where: dateFilter ? { markedWastedAt: dateFilter } : {},
      }),
      prisma.usedItem.count({
        where: dateFilter ? { markedUsedAt: dateFilter } : {},
      }),
      prisma.category.findMany({
        select: {
          name: true,
          _count: {
            select: { foodItems: true },
          },
        },
        orderBy: {
          foodItems: { _count: "desc" },
        },
        take: 5,
      }),
    ])

    const topCategoriesFormatted = topCategories.map((c) => ({
      name: c.name,
      count: c._count.foodItems,
    }))

    return Response.json({
      range,
      activeUsers,
      totalReceipts,
      activeFoodItems,
      wastedItems,
      usedItems,
      topCategories: topCategoriesFormatted,
    })
  } catch (error) {
    console.error("Failed to fetch analytics:", error)
    return Response.json(
      { error: "Failed to fetch analytics. Please try again." },
      { status: 500 }
    )
  }
}
