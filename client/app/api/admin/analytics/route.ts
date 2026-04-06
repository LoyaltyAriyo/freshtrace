import { NextResponse } from "next/server"

import { requireAdmin } from "@/lib/auth/require-admin"
import { prisma } from "@/lib/prisma"

type AllowedRange = "today" | "7d" | "30d"

function parseRange(raw: string | null): { range: AllowedRange; startDate: Date } {
  const normalized = (raw ?? "").toLowerCase()

  let range: AllowedRange = "7d"
  if (normalized === "today" || normalized === "7d" || normalized === "30d") {
    range = normalized
  }

  const now = new Date()

  if (range === "today") {
    const start = new Date(now)
    start.setHours(0, 0, 0, 0)
    return { range, startDate: start }
  }

  const days = range === "30d" ? 30 : 7
  return { range, startDate: new Date(now.getTime() - days * 24 * 60 * 60 * 1000) }
}

export async function GET(request: Request) {
  const auth = await requireAdmin()
  if (!auth.ok) {
    return auth.response
  }

  try {
    const { searchParams } = new URL(request.url)
    const { range, startDate } = parseRange(searchParams.get("range"))

    const [
      totalItems,
      activeItems,
      usedItems,
      wastedItems,
      receiptCount,
      categoryBreakdown,
      wasteByCategory,
      recentWaste,
    ] = await Promise.all([
      // Total food items ever tracked
      prisma.foodItem.count(),

      // Currently active items
      prisma.foodItem.count({
        where: { status: "ACTIVE" },
      }),

      // Items marked used in range
      prisma.usedItem.count({
        where: { markedUsedAt: { gte: startDate } },
      }),

      // Items marked wasted in range
      prisma.wastedItem.count({
        where: { markedWastedAt: { gte: startDate } },
      }),

      // Receipts uploaded in range
      prisma.receipt.count({
        where: { uploadedAt: { gte: startDate } },
      }),

      // Active items grouped by category
      prisma.foodItem.groupBy({
        by: ["categoryId"],
        where: { status: "ACTIVE" },
        _count: { id: true },
      }),

      // Wasted items grouped by category (in range)
      prisma.wastedItem.groupBy({
        by: ["categoryId"],
        where: { markedWastedAt: { gte: startDate } },
        _count: { id: true },
        _sum: { quantity: true },
      }),

      // 10 most recently wasted items
      prisma.wastedItem.findMany({
        where: { markedWastedAt: { gte: startDate } },
        orderBy: { markedWastedAt: "desc" },
        take: 10,
        select: {
          id: true,
          name: true,
          quantity: true,
          markedWastedAt: true,
          category: { select: { name: true } },
        },
      }),
    ])

    // Resolve category names for the groupBy results
    const categoryIds = [
      ...new Set([
        ...categoryBreakdown.map((c) => c.categoryId),
        ...wasteByCategory.map((c) => c.categoryId),
      ]),
    ]

    const categories = await prisma.category.findMany({
      where: { id: { in: categoryIds } },
      select: { id: true, name: true },
    })

    const categoryMap = new Map(categories.map((c) => [c.id, c.name]))

    // Build category breakdown with names
    const itemsByCategory = categoryBreakdown.map((row) => ({
      categoryId: row.categoryId,
      categoryName: categoryMap.get(row.categoryId) ?? "Unknown",
      activeCount: row._count.id,
    }))

    const wasteByCategoryNamed = wasteByCategory.map((row) => ({
      categoryId: row.categoryId,
      categoryName: categoryMap.get(row.categoryId) ?? "Unknown",
      wastedCount: row._count.id,
      wastedQuantity: row._sum.quantity ?? 0,
    }))

    // Compute waste rate
    const disposed = usedItems + wastedItems
    const wasteRate = disposed > 0 ? Math.round((wastedItems / disposed) * 10000) / 100 : 0

    return NextResponse.json({
      range,
      summary: {
        totalItems,
        activeItems,
        usedItems,
        wastedItems,
        receiptCount,
        wasteRate,
      },
      breakdown: {
        itemsByCategory,
        wasteByCategory: wasteByCategoryNamed,
      },
      recentWaste: recentWaste.map((item) => ({
        id: item.id,
        name: item.name,
        quantity: item.quantity,
        categoryName: item.category.name,
        markedWastedAt: item.markedWastedAt.toISOString(),
      })),
      generatedAt: new Date().toISOString(),
    })
  } catch (error) {
    console.error("Failed to load analytics data:", error)
    return NextResponse.json(
      { error: "Failed to load analytics data." },
      { status: 500 },
    )
  }
}
