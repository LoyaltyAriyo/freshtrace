"use client"

import { useEffect, useState } from "react"
import { AlertTriangle, ChevronRight, Search } from "lucide-react"

import { Badge } from "@/components/ui/badge"
import { Card, CardContent } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet"
import { cn } from "@/lib/utils"

type ErrorLog = {
  id: string
  message: string
  errorType: string
  severity: "INFO" | "WARNING" | "ERROR" | "CRITICAL"
  source: "OCR" | "API" | "DB" | "AUTH" | "SYSTEM"
  details: Record<string, unknown> | null
  stackTrace: string | null
  createdAt: string
}

const errorTypeColors: Record<string, string> = {
  OCR_FAILURE: "bg-destructive/15 text-destructive border-destructive/20",
  VALIDATION_ERROR: "bg-yellow-100 text-yellow-800 border-yellow-200",
  API_TIMEOUT: "bg-blue-100 text-blue-800 border-blue-200",
  AUTH_ERROR: "bg-purple-100 text-purple-800 border-purple-200",
  DB_ERROR: "bg-orange-100 text-orange-800 border-orange-200",
}

const severityColors: Record<string, string> = {
  INFO: "bg-blue-100 text-blue-800 border-blue-200",
  WARNING: "bg-yellow-100 text-yellow-800 border-yellow-200",
  ERROR: "bg-orange-100 text-orange-800 border-orange-200",
  CRITICAL: "bg-red-100 text-red-800 border-red-200",
}

function formatRelativeTime(dateStr: string) {
  const diff = Date.now() - new Date(dateStr).getTime()
  const minutes = Math.floor(diff / 60000)
  if (minutes < 1) return "just now"
  if (minutes < 60) return `${minutes}m ago`
  const hours = Math.floor(minutes / 60)
  if (hours < 24) return `${hours}h ago`
  return `${Math.floor(hours / 24)}d ago`
}

export default function AdminErrorLogsPage() {
  const [logs, setLogs] = useState<ErrorLog[]>([])
  const [total, setTotal] = useState(0)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [search, setSearch] = useState("")
  const [selected, setSelected] = useState<ErrorLog | null>(null)

  useEffect(() => {
    setLoading(true)
    setError(null)
    fetch("/api/admin/errors?limit=100")
      .then((res) => {
        if (!res.ok) throw new Error(`HTTP ${res.status}`)
        return res.json()
      })
      .then((json) => {
        setLogs(json.logs)
        setTotal(json.total)
        setLoading(false)
      })
      .catch((err) => {
        console.error("Error logs fetch error:", err)
        setError("Failed to load error logs.")
        setLoading(false)
      })
  }, [])

  const filtered = logs.filter(
    (e) =>
      e.message.toLowerCase().includes(search.toLowerCase()) ||
      e.errorType.toLowerCase().includes(search.toLowerCase()) ||
      e.source.toLowerCase().includes(search.toLowerCase()) ||
      e.severity.toLowerCase().includes(search.toLowerCase()),
  )

  return (
    <div className="flex flex-col gap-6">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight text-foreground">Error Logs</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          {loading ? "Loading..." : `${total} error entries recorded`}
        </p>
      </div>

      {error && <p className="text-sm text-destructive">{error}</p>}

      <div className="relative">
        <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
        <Input
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Search errors by message, type, severity, or source..."
          className="pl-9"
        />
      </div>

      <div className="flex flex-col gap-2">
        {filtered.map((log) => (
          <Card
            key={log.id}
            className="cursor-pointer transition-all hover:border-primary/20"
            onClick={() => setSelected(log)}
          >
            <CardContent className="flex items-center gap-3 px-4 py-3">
              <AlertTriangle className="h-4 w-4 shrink-0 text-destructive" />

              <div className="flex flex-1 flex-col gap-1 sm:flex-row sm:items-center sm:gap-3">
                <span className="min-w-0 flex-1 truncate text-sm font-medium text-foreground">
                  {log.message}
                </span>

                <div className="flex flex-wrap items-center gap-1.5">
                  <Badge
                    variant="outline"
                    className={cn(
                      "px-1.5 py-0 text-[10px]",
                      errorTypeColors[log.errorType] || "bg-muted text-muted-foreground",
                    )}
                  >
                    {log.errorType}
                  </Badge>

                  <Badge
                    variant="outline"
                    className={cn(
                      "px-1.5 py-0 text-[10px]",
                      severityColors[log.severity] || "bg-muted text-muted-foreground",
                    )}
                  >
                    {log.severity}
                  </Badge>

                  <span className="text-xs text-muted-foreground">{log.source}</span>
                </div>
              </div>

              <span className="hidden text-xs text-muted-foreground sm:block">
                {formatRelativeTime(log.createdAt)}
              </span>

              <ChevronRight className="h-4 w-4 text-muted-foreground" />
            </CardContent>
          </Card>
        ))}

        {!loading && filtered.length === 0 && (
          <Card>
            <CardContent className="flex flex-col items-center gap-3 py-12 text-center">
              <div className="flex h-12 w-12 items-center justify-center rounded-full bg-muted">
                <Search className="h-6 w-6 text-muted-foreground" />
              </div>
              <p className="text-sm font-medium text-foreground">No errors found</p>
              <p className="text-xs text-muted-foreground">
                {search ? "Try a different search term" : "No error entries recorded yet"}
              </p>
            </CardContent>
          </Card>
        )}
      </div>

      <Sheet open={!!selected} onOpenChange={(open) => !open && setSelected(null)}>
        <SheetContent className="sm:max-w-lg">
          {selected && (
            <>
              <SheetHeader>
                <SheetTitle className="text-left">Error Details</SheetTitle>
                <SheetDescription className="text-left">
                  {formatRelativeTime(selected.createdAt)}
                </SheetDescription>
              </SheetHeader>

              <div className="mt-6 flex flex-col gap-5">
                <div>
                  <p className="mb-1 text-xs font-medium uppercase tracking-wider text-muted-foreground">
                    Message
                  </p>
                  <p className="text-sm text-foreground">{selected.message}</p>
                </div>

                <div className="flex flex-wrap gap-6">
                  <div>
                    <p className="mb-1 text-xs font-medium uppercase tracking-wider text-muted-foreground">
                      Error Type
                    </p>
                    <Badge
                      variant="outline"
                      className={cn(
                        "text-xs",
                        errorTypeColors[selected.errorType] || "bg-muted text-muted-foreground",
                      )}
                    >
                      {selected.errorType}
                    </Badge>
                  </div>

                  <div>
                    <p className="mb-1 text-xs font-medium uppercase tracking-wider text-muted-foreground">
                      Severity
                    </p>
                    <Badge
                      variant="outline"
                      className={cn(
                        "text-xs",
                        severityColors[selected.severity] || "bg-muted text-muted-foreground",
                      )}
                    >
                      {selected.severity}
                    </Badge>
                  </div>

                  <div>
                    <p className="mb-1 text-xs font-medium uppercase tracking-wider text-muted-foreground">
                      Source
                    </p>
                    <p className="text-sm text-foreground">{selected.source}</p>
                  </div>
                </div>

                <div>
                  <p className="mb-1 text-xs font-medium uppercase tracking-wider text-muted-foreground">
                    Timestamp
                  </p>
                  <p className="text-sm text-foreground">
                    {new Date(selected.createdAt).toLocaleString()}
                  </p>
                </div>

                {selected.details && (
                  <div>
                    <p className="mb-1 text-xs font-medium uppercase tracking-wider text-muted-foreground">
                      Details
                    </p>
                    <div className="rounded-lg bg-muted p-3">
                      <p className="font-mono text-sm leading-relaxed text-foreground">
                        {JSON.stringify(selected.details, null, 2)}
                      </p>
                    </div>
                  </div>
                )}

                {selected.stackTrace && (
                  <div>
                    <p className="mb-1 text-xs font-medium uppercase tracking-wider text-muted-foreground">
                      Stack Trace
                    </p>
                    <div className="rounded-lg bg-muted p-3">
                      <p className="font-mono text-xs leading-relaxed text-foreground whitespace-pre-wrap">
                        {selected.stackTrace}
                      </p>
                    </div>
                  </div>
                )}
              </div>
            </>
          )}
        </SheetContent>
      </Sheet>
    </div>
  )
}
