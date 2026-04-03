"use client"

import { useState } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Users, Home, Package, ScanLine } from "lucide-react"

const timeRanges = [
  { value: "today", label: "Today" },
  { value: "7d", label: "Last 7 days" },
  { value: "30d", label: "Last 30 days" },
]

const statsData: Record<string, { households: number; users: number; items: number; receipts: number }> = {
  today: { households: 142, users: 218, items: 1847, receipts: 34 },
  "7d": { households: 142, users: 218, items: 2156, receipts: 187 },
  "30d": { households: 142, users: 218, items: 3420, receipts: 612 },
}

export default function AdminOverviewPage() {
  const [range, setRange] = useState("7d")
  const stats = statsData[range]

  const cards = [
    { label: "Total Households", value: stats.households, icon: Home, change: "+3 this week" },
    { label: "Active Users", value: stats.users, icon: Users, change: "+12 this week" },
    { label: "Active Food Items", value: stats.items, icon: Package, change: `${stats.items} tracked` },
    { label: "Receipt Uploads", value: stats.receipts, icon: ScanLine, change: `in ${timeRanges.find((t) => t.value === range)?.label?.toLowerCase()}` },
  ]

  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight text-foreground">Admin Overview</h1>
          <p className="mt-1 text-sm text-muted-foreground">System-level dashboard (read-only)</p>
        </div>
        <Select value={range} onValueChange={setRange}>
          <SelectTrigger className="w-40">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {timeRanges.map((t) => (
              <SelectItem key={t.value} value={t.value}>{t.label}</SelectItem>
            ))}
          </SelectContent>
        </Select>
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
    </div>
  )
}
