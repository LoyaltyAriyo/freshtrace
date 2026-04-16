import { prisma } from "@/lib/prisma"
import { getCurrentUserId } from "@/lib/auth"
import { logError } from "@/lib/logger"
import { getOverviewMetrics, parseTimeRange } from "@/lib/queries/overview-metrics"
import { getExtendedMetrics } from "@/lib/queries/extended-metrics"

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
    const range = parseTimeRange(searchParams.get("range"))
    const detailed = searchParams.get("detailed") === "true"

    const metrics = await getOverviewMetrics(range)

    if (!detailed) {
      return Response.json({
        range,
        summary: metrics,
        generatedAt: new Date().toISOString(),
      })
    }

    const extended = await getExtendedMetrics(range)

    return Response.json({
      range,
      summary: metrics,
      ...extended,
      generatedAt: new Date().toISOString(),
    })
  } catch (error) {
    await logError({
      message: "Failed to load admin overview data.",
      error,
      errorType: "ADMIN_OVERVIEW_FETCH_FAILED",
      source: "DB",
      details: { route: "GET /api/admin/overview" },
    })
    return Response.json(
      { error: "Failed to load admin overview data." },
      { status: 500 }
    )
  }
}
