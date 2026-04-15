"use client"

import Link from "next/link"
import { useEffect, useState } from "react"
import {
  BarChart3,
  FileText,
  Package,
  ScanLine,
  TrendingUp,
  TriangleAlert,
  Users,
} from "lucide-react"

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { ReportSummaryChart } from "@/components/admin/report-summary-chart"
import { UsageTrendChart } from "@/components/admin/usage-trend-chart"

const timeRanges = [
  { value: "today", label: "Today" },
  { value: "7d", label: "Last 7 days" },
  { value: "30d", label: "Last 30 days" },
]

type OverviewSummary = {
  totalHouseholds: number
  activeUsers: number
  activeFoodItems: number
  receiptUploads: number
  usedItemsCount: number
  wastedItemsCount: number
  wasteRate: number
}

export default function AdminOverviewPage() {
  const [range, setRange] = useState("7d")
  const [summary, setSummary] = useState<OverviewSummary | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    setLoading(true)
    setError(null)
    fetch(`/api/admin/overview?range=${range}`)
      .then((res) => {
        if (!res.ok) throw new Error(`HTTP ${res.status}`)
        return res.json()
      })
      .then((json) => {
        setSummary(json.summary)
        setLoading(false)
      })
      .catch((err) => {
        console.error("Overview fetch error:", err)
        setError("Failed to load overview data.")
        setLoading(false)
      })
  }, [range])

  const val = (n: number | undefined) => (loading ? "—" : (n ?? 0).toLocaleString())

  const analyticsCards = [
    { label: "Active Users", value: val(summary?.activeUsers), icon: Users },
    { label: "Active Food Items", value: val(summary?.activeFoodItems), icon: Package },
    {
      label: "Receipt Uploads",
      value: val(summary?.receiptUploads),
      icon: ScanLine,
      change: `in ${timeRanges.find((t) => t.value === range)?.label?.toLowerCase()}`,
    },
    {
      label: "Waste Rate",
      value: loading ? "—" : `${summary?.wasteRate ?? 0}%`,
      icon: BarChart3,
    },
  ]

  const reportCards = [
    { title: "Waste Report", value: val(summary?.wastedItemsCount), description: "Items marked as wasted", icon: TriangleAlert },
    { title: "Usage Report", value: val(summary?.usedItemsCount), description: "Items successfully used", icon: TrendingUp },
    { title: "Receipt Uploads", value: val(summary?.receiptUploads), description: "Receipts scanned", icon: FileText },
    { title: "Active Users", value: val(summary?.activeUsers), description: "Users currently active", icon: Users },
  ]

  const reportSummary = summary
    ? {
        receiptUploads: summary.receiptUploads,
        usedItemsCount: summary.usedItemsCount,
        wastedItemsCount: summary.wastedItemsCount,
      }
    : undefined

  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight text-foreground">Admin Overview</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            System-level dashboard with analytics and reports
          </p>
          <p className="mt-2">
            <Link href="/admin/users" className="text-sm font-medium text-primary hover:underline">
              View users
            </Link>
          </p>
        </div>

        <Select value={range} onValueChange={setRange}>
          <SelectTrigger className="w-40">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {timeRanges.map((t) => (
              <SelectItem key={t.value} value={t.value}>
                {t.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {error && <p className="text-sm text-destructive">{error}</p>}

      <section className="flex flex-col gap-3" aria-label="Admin analytics">
        <div>
          <h2 className="text-lg font-semibold text-foreground">Analytics</h2>
          <p className="text-sm text-muted-foreground">
            Overview of users, food items, and receipt activity
          </p>
        </div>
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {analyticsCards.map((card) => (
            <Card key={card.label}>
              <CardHeader className="flex flex-row items-center justify-between pb-2">
                <CardTitle className="text-sm font-medium text-muted-foreground">
                  {card.label}
                </CardTitle>
                <card.icon className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-semibold text-foreground">{card.value}</div>
                {"change" in card && card.change && (
                  <p className="mt-0.5 text-xs text-muted-foreground">{card.change}</p>
                )}
              </CardContent>
            </Card>
          ))}
        </div>
      </section>

      <section className="flex flex-col gap-3" aria-label="Admin reports">
        <div>
          <h2 className="text-lg font-semibold text-foreground">Reports</h2>
          <p className="text-sm text-muted-foreground">
            Key reporting metrics for waste, usage, and activity
          </p>
        </div>
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {reportCards.map((report) => (
            <Card key={report.title}>
              <CardHeader className="flex flex-row items-center justify-between pb-2">
                <CardTitle className="text-sm font-medium text-muted-foreground">
                  {report.title}
                </CardTitle>
                <report.icon className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-semibold text-foreground">{report.value}</div>
                <p className="mt-0.5 text-xs text-muted-foreground">{report.description}</p>
              </CardContent>
            </Card>
          ))}
        </div>
      </section>

      <section className="grid gap-4 lg:grid-cols-2" aria-label="Usage trends and summary charts">
        <UsageTrendChart />
        <ReportSummaryChart summary={reportSummary} />
      </section>
    </div>
  )
}
