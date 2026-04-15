"use client"

import Link from "next/link"
import { useState } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import {
  Users,
  Home,
  Package,
  ScanLine,
  TriangleAlert,
  BarChart3,
  FileText,
  TrendingUp,
} from "lucide-react"
import { UsageTrendChart } from "@/components/admin/usage-trend-chart"
import { ReportSummaryChart } from "@/components/admin/report-summary-chart"

const timeRanges = [
  { value: "today", label: "Today" },
  { value: "7d", label: "Last 7 days" },
  { value: "30d", label: "Last 30 days" },
]

const statsData: Record<
  string,
  {
    households: number
    users: number
    items: number
    receipts: number
    wastedItems: number
    usedItems: number
    reportsGenerated: number
    activeAlerts: number
    topCategories: { name: string; count: number }[]
  }
> = {
  today: {
    households: 142,
    users: 218,
    items: 1847,
    receipts: 34,
    wastedItems: 12,
    usedItems: 46,
    reportsGenerated: 8,
    activeAlerts: 19,
    topCategories: [
      { name: "Produce", count: 420 },
      { name: "Dairy", count: 315 },
      { name: "Meat", count: 210 },
    ],
  },
  "7d": {
    households: 142,
    users: 218,
    items: 2156,
    receipts: 187,
    wastedItems: 58,
    usedItems: 241,
    reportsGenerated: 21,
    activeAlerts: 43,
    topCategories: [
      { name: "Produce", count: 610 },
      { name: "Dairy", count: 472 },
      { name: "Pantry", count: 350 },
    ],
  },
  "30d": {
    households: 142,
    users: 218,
    items: 3420,
    receipts: 612,
    wastedItems: 184,
    usedItems: 903,
    reportsGenerated: 67,
    activeAlerts: 96,
    topCategories: [
      { name: "Produce", count: 980 },
      { name: "Dairy", count: 750 },
      { name: "Pantry", count: 540 },
    ],
  },
}

export default function AdminOverviewPage() {
  const [range, setRange] = useState("7d")
  const stats = statsData[range]

  const cards = [
    { label: "Total Households", value: stats.households, icon: Home, change: "+3 this week" },
    { label: "Active Users", value: stats.users, icon: Users, change: "+12 this week" },
    { label: "Active Food Items", value: stats.items, icon: Package, change: `${stats.items} tracked` },
    {
      label: "Receipt Uploads",
      value: stats.receipts,
      icon: ScanLine,
      change: `in ${timeRanges.find((t) => t.value === range)?.label?.toLowerCase()}`,
    },
  ]

  const reports = [
    {
      title: "Waste Report",
      value: stats.wastedItems,
      description: "Items marked as wasted",
      icon: TriangleAlert,
    },
    {
      title: "Usage Report",
      value: stats.usedItems,
      description: "Items successfully used",
      icon: TrendingUp,
    },
    {
      title: "Reports Generated",
      value: stats.reportsGenerated,
      description: "Summary reports created",
      icon: FileText,
    },
    {
      title: "Active Alerts",
      value: stats.activeAlerts,
      description: "Notifications needing attention",
      icon: BarChart3,
    },
  ]

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

      <section className="flex flex-col gap-3" aria-label="Admin analytics">
        <div>
          <h2 className="text-lg font-semibold text-foreground">Analytics</h2>
          <p className="text-sm text-muted-foreground">
            Overview of households, users, food items, and receipt activity
          </p>
        </div>

        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {cards.map((card) => (
            <Card key={card.label}>
              <CardHeader className="flex flex-row items-center justify-between pb-2">
                <CardTitle className="text-sm font-medium text-muted-foreground">
                  {card.label}
                </CardTitle>
                <card.icon className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-semibold text-foreground">
                  {card.value.toLocaleString()}
                </div>
                <p className="mt-0.5 text-xs text-muted-foreground">{card.change}</p>
              </CardContent>
            </Card>
          ))}
        </div>
      </section>

      <section className="flex flex-col gap-3" aria-label="Admin reports">
        <div>
          <h2 className="text-lg font-semibold text-foreground">Reports</h2>
          <p className="text-sm text-muted-foreground">
            Key reporting metrics for waste, usage, and alert activity
          </p>
        </div>

        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {reports.map((report) => (
            <Card key={report.title}>
              <CardHeader className="flex flex-row items-center justify-between pb-2">
                <CardTitle className="text-sm font-medium text-muted-foreground">
                  {report.title}
                </CardTitle>
                <report.icon className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-semibold text-foreground">
                  {report.value.toLocaleString()}
                </div>
                <p className="mt-0.5 text-xs text-muted-foreground">{report.description}</p>
              </CardContent>
            </Card>
          ))}
        </div>
      </section>

      <section className="grid gap-4 lg:grid-cols-3" aria-label="Detailed report summaries">
        <Card className="lg:col-span-2">
          <CardHeader>
            <CardTitle className="text-base">Top Categories</CardTitle>
          </CardHeader>
          <CardContent className="flex flex-col gap-3">
            {stats.topCategories.map((category) => (
              <div
                key={category.name}
                className="flex items-center justify-between rounded-md border px-3 py-2"
              >
                <span className="text-sm text-foreground">{category.name}</span>
                <span className="text-sm font-medium text-muted-foreground">
                  {category.count.toLocaleString()} items
                </span>
              </div>
            ))}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-base">Report Summary</CardTitle>
          </CardHeader>
          <CardContent className="flex flex-col gap-3 text-sm text-muted-foreground">
            <p>
              The admin overview highlights platform activity for the selected time range.
            </p>
            <p>
              Produce and dairy continue to represent the highest item volume across households.
            </p>
            <p>
              Waste and active alerts can be monitored here to support future reporting features.
            </p>
          </CardContent>
        </Card>
      </section>

      <section
        className="grid gap-4 lg:grid-cols-2"
        aria-label="Usage trends and summary charts"
      >
        <UsageTrendChart />
        <ReportSummaryChart />
      </section>
    </div>
  )
}
