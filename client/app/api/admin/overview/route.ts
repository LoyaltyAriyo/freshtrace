import { prisma } from "@/lib/prisma"
import { getCurrentUserId } from "@/lib/auth"

type AllowedRange = "today" | "7d" | "30d"

type AdminOverviewSummary = {
  totalHouseholds: number
  activeUsers: number
  activeFoodItems: number
  receiptUploads: number
}

type AdminOverviewResponse = {
  range: AllowedRange
  summary: AdminOverviewSummary
  generatedAt: string
}

function resolveRange(param: string | null): { range: AllowedRange; startDate: Date } {
  const normalized = (param ?? "").toLowerCase()

  let range: AllowedRange = "7d"

  if (normalized === "today" || normalized === "7d" || normalized === "30d") {
    range = normalized
  }

  const now = new Date()

  if (range === "today") {
    const startOfDay = new Date(now)
    startOfDay.setHours(0, 0, 0, 0)
    return { range, startDate: startOfDay }
  }

  const days =
    range === "30d"
      ? 30
      : 7

  const startDate = new Date(now.getTime() - days * 24 * 60 * 60 * 1000)
  return { range, startDate }
}

export async function GET(request: Request) {
  try {
    const userId = await getCurrentUserId(request)

    if (!userId) {
      return Response.json(
        { error: "Authentication required." },
        { status: 401 }
      )
    }

    const currentUser = await prisma.user.findUnique({
      where: { id: userId },
      select: { role: true },
    })

    if (!currentUser) {
      return Response.json(
        { error: "User not found." },
        { status: 401 }
      )
    }

    if (currentUser.role !== "ADMIN") {
      return Response.json(
        { error: "Admin access required." },
        { status: 403 }
      )
    }

    const { searchParams } = new URL(request.url)
    const rawRange = searchParams.get("range")
    const { range, startDate } = resolveRange(rawRange)

    const [activeUsers, activeFoodItems, receiptUploads] = await Promise.all([
      prisma.user.count({
        where: {
          accountStatus: "ACTIVE",
        },
      }),
      prisma.foodItem.count({
        where: {
          status: "ACTIVE",
        },
      }),
      prisma.receipt.count({
        where: {
          uploadedAt: {
            gte: startDate,
          },
        },
      }),
    ])

    const payload: AdminOverviewResponse = {
      range,
      summary: {
        // Household persistence is not implemented yet; this is intentionally a placeholder.
        totalHouseholds: 0,
        activeUsers,
        activeFoodItems,
        receiptUploads,
      },
      generatedAt: new Date().toISOString(),
    }

    return Response.json(payload)
  } catch (error) {
    console.error("Failed to load admin overview data:", error)
    return Response.json(
      { error: "Failed to load admin overview data." },
      { status: 500 }
    )
  }
}

