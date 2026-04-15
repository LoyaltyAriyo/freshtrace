import { prisma } from "@/lib/prisma"

export type TimeRange = "today" | "7d" | "30d"

export type OverviewMetrics = {
  totalHouseholds: number
  activeUsers: number
  activeFoodItems: number
  receiptUploads: number
  usedItemsCount: number
  wastedItemsCount: number
  wasteRate: number
}

/**
 * Start of the window for analytics queries (inclusive).
 */
export function resolveStartDate(range: TimeRange): Date {
  const now = new Date()

  if (range === "today") {
    const startOfDay = new Date(now)
    startOfDay.setHours(0, 0, 0, 0)
    return startOfDay
  }

  const days = range === "30d" ? 30 : 7
  return new Date(now.getTime() - days * 24 * 60 * 60 * 1000)
}

/**
 * Normalise query string to a supported range; unknown values default to 7d.
 */
export function parseTimeRange(raw: string | null): TimeRange {
  const normalized = (raw ?? "").toLowerCase()
  if (normalized === "today" || normalized === "7d" || normalized === "30d") {
    return normalized
  }
  return "7d"
}

/**
 * Collect all overview metrics for the admin dashboard.
 *
 * Every query runs in a single Promise.all so the round-trips are
 * parallelised. The function is pure data — no auth checks, no HTTP
 * concerns — so it can be reused by future analytics endpoints.
 */
export async function getOverviewMetrics(range: TimeRange): Promise<OverviewMetrics> {
  const startDate = resolveStartDate(range)

  const [
    activeUsers,
    activeFoodItems,
    receiptUploads,
    usedItemsCount,
    wastedItemsCount,
    totalFoodItems,
  ] = await Promise.all([
    prisma.user.count({
      where: { accountStatus: "ACTIVE" },
    }),

    prisma.foodItem.count({
      where: { status: "ACTIVE" },
    }),

    prisma.receipt.count({
      where: { uploadedAt: { gte: startDate } },
    }),

    prisma.usedItem.count({
      where: { markedUsedAt: { gte: startDate } },
    }),

    prisma.wastedItem.count({
      where: { markedWastedAt: { gte: startDate } },
    }),

    prisma.foodItem.count(),
  ])

  const disposed = usedItemsCount + wastedItemsCount
  const wasteRate = disposed > 0 ? (wastedItemsCount / disposed) * 100 : 0

  return {
    // Household persistence is not implemented yet; intentional placeholder.
    totalHouseholds: 0,
    activeUsers,
    activeFoodItems,
    receiptUploads,
    usedItemsCount,
    wastedItemsCount,
    wasteRate: Math.round(wasteRate * 100) / 100,
  }
}
