import { NextResponse } from "next/server"

import { requireAdmin } from "@/lib/auth/require-admin"
import { getErrorLogs } from "@/lib/queries/error-logs"
import type { ErrorSeverity, ErrorSource } from "@/generated/prisma-client"

const VALID_SEVERITIES: ErrorSeverity[] = ["INFO", "WARNING", "ERROR", "CRITICAL"]
const VALID_SOURCES: ErrorSource[] = ["OCR", "API", "DB", "AUTH", "SYSTEM"]

export async function GET(request: Request) {
  const auth = await requireAdmin()
  if (!auth.ok) {
    return auth.response
  }

  try {
    const { searchParams } = new URL(request.url)

    const severityParam = searchParams.get("severity")?.toUpperCase()
    const sourceParam = searchParams.get("source")?.toUpperCase()
    const limitParam = parseInt(searchParams.get("limit") ?? "50", 10)
    const offsetParam = parseInt(searchParams.get("offset") ?? "0", 10)

    const severity = VALID_SEVERITIES.includes(severityParam as ErrorSeverity)
      ? (severityParam as ErrorSeverity)
      : undefined

    const source = VALID_SOURCES.includes(sourceParam as ErrorSource)
      ? (sourceParam as ErrorSource)
      : undefined

    const limit = Number.isFinite(limitParam) && limitParam > 0 ? Math.min(limitParam, 100) : 50
    const offset = Number.isFinite(offsetParam) && offsetParam >= 0 ? offsetParam : 0

    const data = await getErrorLogs({ severity, source, limit, offset })

    return NextResponse.json(data)
  } catch (error) {
    console.error("Failed to load error logs:", error)
    return NextResponse.json(
      { error: "Failed to load error logs." },
      { status: 500 },
    )
  }
}
