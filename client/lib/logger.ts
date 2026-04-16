import { prisma } from "@/lib/prisma"

import type { ErrorSeverity, ErrorSource, Prisma } from "@/generated/prisma-client"

type JsonValue = Prisma.InputJsonValue | null
type ErrorLogContext = Record<string, JsonValue>

type ErrorLogInput = {
  message: string
  errorType: string
  source: ErrorSource
  severity?: ErrorSeverity
  error?: unknown
  details?: ErrorLogContext
}

function getErrorSummary(error: unknown): ErrorLogContext | null {
  if (error instanceof Error) {
    const summary: ErrorLogContext = {
      name: error.name,
      message: error.message,
    }

    const errorWithCode = error as Error & { code?: unknown }
    if (typeof errorWithCode.code === "string") {
      summary.code = errorWithCode.code
    }

    return summary
  }

  if (typeof error === "string") {
    return { message: error }
  }

  if (typeof error === "object" && error !== null) {
    const summary: ErrorLogContext = {}

    const errorRecord = error as Record<string, unknown>
    if (typeof errorRecord.name === "string") {
      summary.name = errorRecord.name
    }
    if (typeof errorRecord.message === "string") {
      summary.message = errorRecord.message
    }
    if (typeof errorRecord.code === "string") {
      summary.code = errorRecord.code
    }

    return Object.keys(summary).length > 0 ? summary : { value: String(error) }
  }

  return null
}

function getStackTrace(error: unknown): string | null {
  return error instanceof Error && typeof error.stack === "string" ? error.stack : null
}

export function logInfo(message: string) {
  console.log(`[INFO] ${new Date().toISOString()} - ${message}`)
}

export async function logError({
  message,
  errorType,
  source,
  severity = "ERROR",
  error,
  details,
}: ErrorLogInput) {
  console.error(`[${source}] ${message}`, error)

  const payload: ErrorLogContext = {}

  if (details && Object.keys(details).length > 0) {
    payload.context = details
  }

  const errorSummary = getErrorSummary(error)
  if (errorSummary) {
    payload.error = errorSummary
  }

  try {
    await prisma.errorLog.create({
      data: {
        message,
        errorType,
        severity,
        source,
        details: Object.keys(payload).length > 0 ? (payload as Prisma.InputJsonObject) : undefined,
        stackTrace: getStackTrace(error),
      },
    })
  } catch (persistError) {
    console.error("[SYSTEM] Failed to persist error log", persistError)
  }
}
