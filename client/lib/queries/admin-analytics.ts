import { prisma } from "@/lib/prisma"

import type { TimeRange } from "./overview-metrics"
import { resolveStartDate } from "./overview-metrics"

export type AdminAnalyticsSummary = {
  totalItems: number
  activeItems: number
  usedItems: number
  wastedItems: number
  receiptCount: number
  wasteRate: number
}

export type ItemsByCategoryRow = {
  categoryId: string
  categoryName: string
  activeCount: number
}

export type WasteByCategoryRow = {
  categoryId: string
  categoryName: string
  wastedCount: number
  wastedQuantity: number
}

export type RecentWasteRow = {
  id: string
  name: string
  quantity: number
  categoryName: string
  markedWastedAt: string
}

export type AdminAnalyticsReport = {
  range: TimeRange
  summary: AdminAnalyticsSummary
  breakdown: {
    itemsByCategory: ItemsByCategoryRow[]
    wasteByCategory: WasteByCategoryRow[]
  }
  recentWaste: RecentWasteRow[]
}

/**
 * Admin analytics for reports: inventory, usage, waste, receipts, category breakdown,
 * and recent waste. Date range applies to usage/waste/receipt metrics; totals include
 * all-time food item counts where noted in queries.
 */
export async function getAdminAnalyticsReport(range: TimeRange): Promise<AdminAnalyticsReport> {
  const startDate = resolveStartDate(range)

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
    prisma.foodItem.count(),
    prisma.foodItem.count({
      where: { status: "ACTIVE" },
    }),
    prisma.usedItem.count({
      where: { markedUsedAt: { gte: startDate } },
    }),
    prisma.wastedItem.count({
      where: { markedWastedAt: { gte: startDate } },
    }),
    prisma.receipt.count({
      where: { uploadedAt: { gte: startDate } },
    }),
    prisma.foodItem.groupBy({
      by: ["categoryId"],
      where: { status: "ACTIVE" },
      _count: { id: true },
    }),
    prisma.wastedItem.groupBy({
      by: ["categoryId"],
      where: { markedWastedAt: { gte: startDate } },
      _count: { id: true },
      _sum: { quantity: true },
    }),
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

  const disposed = usedItems + wastedItems
  const wasteRate = disposed > 0 ? Math.round((wastedItems / disposed) * 10000) / 100 : 0

  return {
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
  }
}
