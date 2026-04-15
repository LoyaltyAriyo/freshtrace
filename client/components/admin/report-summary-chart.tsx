'use client'

import * as React from 'react'
import {
  BarChart,
  Bar,
  CartesianGrid,
  XAxis,
  YAxis,
  Tooltip,
  Cell,
} from 'recharts'

import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Empty, EmptyHeader, EmptyTitle, EmptyDescription } from '@/components/ui/empty'
import { ChartContainer, type ChartConfig } from '@/components/ui/chart'
import { cn } from '@/lib/utils'
import type { OverviewMetrics } from '@/lib/queries/overview-metrics'

type UsageSummary = Pick<
  OverviewMetrics,
  'receiptUploads' | 'usedItemsCount' | 'wastedItemsCount'
>

export type ReportSummaryChartProps = {
  summary?: UsageSummary
  className?: string
}

const reportSummaryConfig = {
  receiptUploads: {
    label: 'Receipt uploads',
    color: 'hsl(var(--chart-1))',
  },
  usedItemsCount: {
    label: 'Items used',
    color: 'hsl(var(--chart-2))',
  },
  wastedItemsCount: {
    label: 'Items wasted',
    color: 'hsl(var(--chart-3))',
  },
} satisfies ChartConfig

const FALLBACK_SUMMARY: UsageSummary = {
  receiptUploads: 612,
  usedItemsCount: 1845,
  wastedItemsCount: 312,
}

type SummaryBarDatum = {
  key: keyof UsageSummary
  label: string
  value: number
}

export function ReportSummaryChart({ summary, className }: ReportSummaryChartProps) {
  const usingFallback = !summary
  const effectiveSummary = summary ?? FALLBACK_SUMMARY

  const chartData: SummaryBarDatum[] = [
    {
      key: 'receiptUploads',
      label: 'Receipts',
      value: effectiveSummary.receiptUploads,
    },
    {
      key: 'usedItemsCount',
      label: 'Used',
      value: effectiveSummary.usedItemsCount,
    },
    {
      key: 'wastedItemsCount',
      label: 'Wasted',
      value: effectiveSummary.wastedItemsCount,
    },
  ]

  const total = chartData.reduce((sum, item) => sum + item.value, 0)
  const isEmpty = total === 0

  if (isEmpty && !usingFallback) {
    return (
      <Card className={className}>
        <CardHeader className="pb-2">
          <CardTitle className="text-base">Report summary</CardTitle>
          <CardDescription>
            Key usage metrics across the system.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Empty className="h-[260px]">
            <EmptyHeader>
              <EmptyTitle>No summary data yet</EmptyTitle>
              <EmptyDescription>
                Summary charts will appear once analytics data is
                available.
              </EmptyDescription>
            </EmptyHeader>
          </Empty>
        </CardContent>
      </Card>
    )
  }

  return (
    <Card className={className}>
      <CardHeader className="pb-2">
        <CardTitle className="text-base">Report summary</CardTitle>
        <CardDescription>
          Snapshot of receipts, used items, and waste.
        </CardDescription>
      </CardHeader>
      <CardContent>
        <ChartContainer
          config={reportSummaryConfig}
          className={cn('h-[260px]', 'mt-2')}
        >
          <BarChart
            data={chartData}
            margin={{ left: 8, right: 8, top: 8, bottom: 0 }}
          >
            <CartesianGrid strokeDasharray="3 3" vertical={false} />
            <XAxis
              dataKey="label"
              tickLine={false}
              axisLine={false}
              tickMargin={8}
            />
            <YAxis
              tickLine={false}
              axisLine={false}
              tickMargin={8}
              allowDecimals={false}
            />
            <Tooltip
              cursor={{ fill: 'hsl(var(--muted))' }}
              contentStyle={{
                backgroundColor: 'hsl(var(--background))',
                borderRadius: 8,
                border: '1px solid hsl(var(--border))',
                fontSize: 12,
              }}
            />
            <Bar dataKey="value" radius={[4, 4, 0, 0]}>
              {chartData.map((item) => (
                <Cell
                  key={item.key}
                  fill={`var(--color-${item.key})`}
                />
              ))}
            </Bar>
          </BarChart>
        </ChartContainer>
        <p className="mt-4 text-xs text-muted-foreground text-center">
          Total across metrics: {total.toLocaleString()}
        </p>
      </CardContent>
    </Card>
  )
}

