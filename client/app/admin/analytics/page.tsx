"use client"

import { useEffect, useState } from "react"
import { Package, ScanLine, TrendingUp, TriangleAlert } from "lucide-react"

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { ReportSummaryChart } from "@/components/admin/report-summary-chart"
import { UsageTrendChart } from "@/components/admin/usage-trend-chart"

const timeRanges = [
  { value: "today", label: "Today" },
  { value: "7d", label: "Last 7 days" },
  { value: "30d", label: "Last 30 days" },
]

type AnalyticsReport = {
  summary: {
    totalItems: number
    activeItems: number
    usedItems: number
    wastedItems: number
    receiptCount: number
    wasteRate: number
  }
  breakdown: {
    itemsByCategory: { categoryId: string; categoryName: string; activeCount: number }[]
    wasteByCategory: {
      categoryId: string
      categoryName: string
      wastedCount: number
      wastedQuantity: number
    }[]
  }
}

export default function AdminAnalyticsPage() {
  const [range, setRange] = useState("7d")
  const [data, setData] = useState<AnalyticsReport | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    setLoading(true)
    setError(null)
    fetch(`/api/admin/analytics?range=${range}`)
      .then((res) => {
        if (!res.ok) throw new Error(`HTTP ${res.status}`)
        return res.json()
      })
      .then((json) => {
        setData(json)
        setLoading(false)
      })
      .catch((err) => {
        console.error("Analytics fetch error:", err)
        setError("Failed to load analytics data.")
        setLoading(false)
      })
  }, [range])

  const reportSummary = data
    ? {
        receiptUploads: data.summary.receiptCount,
        usedItemsCount: data.summary.usedItems,
        wastedItemsCount: data.summary.wastedItems,
      }
    : undefined

  const summaryCards = [
    { label: "Active Items", value: data?.summary.activeItems, icon: Package },
    { label: "Items Used", value: data?.summary.usedItems, icon: TrendingUp },
    { label: "Items Wasted", value: data?.summary.wastedItems, icon: TriangleAlert },
    { label: "Receipt Uploads", value: data?.summary.receiptCount, icon: ScanLine },
  ]

  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight text-foreground">Analytics</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            Detailed breakdown of food usage, waste, and activity
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

      <section className="flex flex-col gap-3" aria-label="Analytics summary">
        <h2 className="text-lg font-semibold text-foreground">Summary</h2>
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {summaryCards.map((card) => (
            <Card key={card.label}>
              <CardHeader className="flex flex-row items-center justify-between pb-2">
                <CardTitle className="text-sm font-medium text-muted-foreground">
                  {card.label}
                </CardTitle>
                <card.icon className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-semibold text-foreground">
                  {loading ? "—" : (card.value ?? 0).toLocaleString()}
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      </section>

      <section className="grid gap-4 lg:grid-cols-2" aria-label="Analytics charts">
        <UsageTrendChart />
        <ReportSummaryChart summary={reportSummary} />
      </section>

      <section className="grid gap-4 lg:grid-cols-2" aria-label="Category breakdown">
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Items by Category</CardTitle>
          </CardHeader>
          <CardContent className="flex flex-col gap-2">
            {loading ? (
              <p className="text-sm text-muted-foreground">Loading...</p>
            ) : data?.breakdown.itemsByCategory.length ? (
              data.breakdown.itemsByCategory.map((row) => (
                <div
                  key={row.categoryId}
                  className="flex items-center justify-between rounded-md border px-3 py-2"
                >
                  <span className="text-sm text-foreground">{row.categoryName}</span>
                  <span className="text-sm font-medium text-muted-foreground">
                    {row.activeCount.toLocaleString()} active
                  </span>
                </div>
              ))
            ) : (
              <p className="text-sm text-muted-foreground">No data for this range.</p>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-base">Waste by Category</CardTitle>
          </CardHeader>
          <CardContent className="flex flex-col gap-2">
            {loading ? (
              <p className="text-sm text-muted-foreground">Loading...</p>
            ) : data?.breakdown.wasteByCategory.length ? (
              data.breakdown.wasteByCategory.map((row) => (
                <div
                  key={row.categoryId}
                  className="flex items-center justify-between rounded-md border px-3 py-2"
                >
                  <span className="text-sm text-foreground">{row.categoryName}</span>
                  <span className="text-sm font-medium text-muted-foreground">
                    {row.wastedCount.toLocaleString()} wasted
                  </span>
                </div>
              ))
            ) : (
              <p className="text-sm text-muted-foreground">No waste data for this range.</p>
            )}
          </CardContent>
        </Card>
      </section>
    </div>
  )
}
