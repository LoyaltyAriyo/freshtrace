import { prisma } from "@/lib/prisma"
import { type TimeRange, resolveStartDate } from "@/lib/queries/overview-metrics"

export type CategoryBreakdown = {
  categoryId: string
  categoryName: string
  activeCount: number
  usedCount: number
  wastedCount: number
  totalQuantity: number
}

export type SourceDistribution = {
  receipt: number
  manual: number
}

export type TopWastedItem = {
  name: string
  categoryName: string
  quantity: number
  markedWastedAt: string
}

export type DailyTrend = {
  date: string
  usedCount: number
  wastedCount: number
}

export type ExtendedMetrics = {
  categoryBreakdown: CategoryBreakdown[]
  sourceDistribution: SourceDistribution
  topWastedItems: TopWastedItem[]
  dailyTrends: DailyTrend[]
}

/**
 * Collect extended metrics: category breakdowns, source distribution,
 * top wasted items, and daily usage/waste trends.
 *
 * Designed to complement `getOverviewMetrics` from overview-metrics.ts.
 * Pure data — no auth, no HTTP concerns.
 */
export async function getExtendedMetrics(range: TimeRange): Promise<ExtendedMetrics> {
  const startDate = resolveStartDate(range)

  const [
    activeByCat,
    usedByCat,
    wastedByCat,
    sourceGroups,
    topWasted,
    usedItems,
    wastedItems,
    categories,
  ] = await Promise.all([
    // Active items grouped by category
    prisma.foodItem.groupBy({
      by: ["categoryId"],
      where: { status: "ACTIVE" },
      _count: { id: true },
      _sum: { quantity: true },
    }),

    // Used items grouped by category (in range)
    prisma.usedItem.groupBy({
      by: ["categoryId"],
      where: { markedUsedAt: { gte: startDate } },
      _count: { id: true },
    }),

    // Wasted items grouped by category (in range)
    prisma.wastedItem.groupBy({
      by: ["categoryId"],
      where: { markedWastedAt: { gte: startDate } },
      _count: { id: true },
    }),

    // Source distribution for active items
    prisma.foodItem.groupBy({
      by: ["source"],
      where: { status: "ACTIVE" },
      _count: { id: true },
    }),

    // Top 10 most recently wasted items
    prisma.wastedItem.findMany({
      where: { markedWastedAt: { gte: startDate } },
      orderBy: { markedWastedAt: "desc" },
      take: 10,
      select: {
        name: true,
        quantity: true,
        markedWastedAt: true,
        category: { select: { name: true } },
      },
    }),

    // All used items in range (for daily trends)
    prisma.usedItem.findMany({
      where: { markedUsedAt: { gte: startDate } },
      select: { markedUsedAt: true },
    }),

    // All wasted items in range (for daily trends)
    prisma.wastedItem.findMany({
      where: { markedWastedAt: { gte: startDate } },
      select: { markedWastedAt: true },
    }),

    // All categories for name resolution
    prisma.category.findMany({
      select: { id: true, name: true },
    }),
  ])

  // Build category name map
  const catMap = new Map(categories.map((c) => [c.id, c.name]))

  // Merge category breakdowns
  const allCatIds = new Set([
    ...activeByCat.map((r) => r.categoryId),
    ...usedByCat.map((r) => r.categoryId),
    ...wastedByCat.map((r) => r.categoryId),
  ])

  const activeMap = new Map(activeByCat.map((r) => [r.categoryId, r]))
  const usedMap = new Map(usedByCat.map((r) => [r.categoryId, r._count.id]))
  const wastedMap = new Map(wastedByCat.map((r) => [r.categoryId, r._count.id]))

  const categoryBreakdown: CategoryBreakdown[] = Array.from(allCatIds).map((catId) => {
    const active = activeMap.get(catId)
    return {
      categoryId: catId,
      categoryName: catMap.get(catId) ?? "Unknown",
      activeCount: active?._count.id ?? 0,
      usedCount: usedMap.get(catId) ?? 0,
      wastedCount: wastedMap.get(catId) ?? 0,
      totalQuantity: active?._sum.quantity ?? 0,
    }
  })

  // Source distribution
  const sourceMap = new Map(sourceGroups.map((r) => [r.source, r._count.id]))
  const sourceDistribution: SourceDistribution = {
    receipt: sourceMap.get("RECEIPT") ?? 0,
    manual: sourceMap.get("MANUAL") ?? 0,
  }

  // Top wasted items
  const topWastedItems: TopWastedItem[] = topWasted.map((item) => ({
    name: item.name,
    categoryName: item.category.name,
    quantity: item.quantity,
    markedWastedAt: item.markedWastedAt.toISOString(),
  }))

  // Daily trends — bucket used/wasted items by date
  const trendMap = new Map<string, { usedCount: number; wastedCount: number }>()

  for (const item of usedItems) {
    const day = item.markedUsedAt.toISOString().slice(0, 10)
    const entry = trendMap.get(day) ?? { usedCount: 0, wastedCount: 0 }
    entry.usedCount++
    trendMap.set(day, entry)
  }

  for (const item of wastedItems) {
    const day = item.markedWastedAt.toISOString().slice(0, 10)
    const entry = trendMap.get(day) ?? { usedCount: 0, wastedCount: 0 }
    entry.wastedCount++
    trendMap.set(day, entry)
  }

  const dailyTrends: DailyTrend[] = Array.from(trendMap.entries())
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([date, counts]) => ({ date, ...counts }))

  return {
    categoryBreakdown,
    sourceDistribution,
    topWastedItems,
    dailyTrends,
  }
}
