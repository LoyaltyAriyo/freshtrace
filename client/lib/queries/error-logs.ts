import { prisma } from "@/lib/prisma"

import type { ErrorSeverity, ErrorSource } from "@/generated/prisma-client"

export type ErrorLogRow = {
  id: string
  message: string
  errorType: string
  severity: ErrorSeverity
  source: ErrorSource
  details: unknown
  stackTrace: string | null
  createdAt: string
}

export type ErrorLogsResult = {
  logs: ErrorLogRow[]
  total: number
}

export type ErrorLogsFilter = {
  severity?: ErrorSeverity
  source?: ErrorSource
  limit?: number
  offset?: number
}

export async function getErrorLogs(filter: ErrorLogsFilter): Promise<ErrorLogsResult> {
  const { severity, source, limit = 50, offset = 0 } = filter

  const where = {
    ...(severity ? { severity } : {}),
    ...(source ? { source } : {}),
  }

  const [logs, total] = await Promise.all([
    prisma.errorLog.findMany({
      where,
      orderBy: { createdAt: "desc" },
      take: limit,
      skip: offset,
    }),
    prisma.errorLog.count({ where }),
  ])

  return {
    logs: logs.map((log) => ({
      id: log.id,
      message: log.message,
      errorType: log.errorType,
      severity: log.severity,
      source: log.source,
      details: log.details,
      stackTrace: log.stackTrace,
      createdAt: log.createdAt.toISOString(),
    })),
    total,
  }
}
