import { NextResponse } from "next/server"

import { requireAdmin } from "@/lib/auth/require-admin"
import { logError } from "@/lib/logger"
import { getAdminAnalyticsReport } from "@/lib/queries/admin-analytics"
import { parseTimeRange } from "@/lib/queries/overview-metrics"

export async function GET(request: Request) {
  const auth = await requireAdmin()
  if (!auth.ok) {
    return auth.response
  }

  try {
    const { searchParams } = new URL(request.url)
    const range = parseTimeRange(searchParams.get("range"))

    const data = await getAdminAnalyticsReport(range)

    return NextResponse.json({
      ...data,
      generatedAt: new Date().toISOString(),
    })
  } catch (error) {
    await logError({
      message: "Failed to load admin analytics.",
      error,
      errorType: "ADMIN_ANALYTICS_FETCH_FAILED",
      source: "DB",
      details: { route: "GET /api/admin/analytics" },
    })
    return NextResponse.json(
      { error: "Failed to load analytics data." },
      { status: 500 },
    )
  }
}
