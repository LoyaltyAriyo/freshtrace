'use client'

import * as React from 'react'
import {
  LineChart,
  Line,
  CartesianGrid,
  XAxis,
  YAxis,
  Tooltip,
} from 'recharts'

import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Empty, EmptyHeader, EmptyTitle, EmptyDescription } from '@/components/ui/empty'
import { ChartContainer, type ChartConfig } from '@/components/ui/chart'
import { cn } from '@/lib/utils'
import type { DailyTrend } from '@/lib/queries/extended-metrics'

const usageTrendConfig = {
  usedCount: {
    label: 'Items used',
    color: 'hsl(var(--chart-1))',
  },
  wastedCount: {
    label: 'Items wasted',
    color: 'hsl(var(--chart-2))',
  },
} satisfies ChartConfig

const FALLBACK_USAGE_TREND: DailyTrend[] = [
  { date: '2025-03-01', usedCount: 8, wastedCount: 2 },
  { date: '2025-03-02', usedCount: 11, wastedCount: 3 },
  { date: '2025-03-03', usedCount: 9, wastedCount: 4 },
  { date: '2025-03-04', usedCount: 13, wastedCount: 5 },
  { date: '2025-03-05', usedCount: 15, wastedCount: 4 },
  { date: '2025-03-06', usedCount: 14, wastedCount: 3 },
  { date: '2025-03-07', usedCount: 16, wastedCount: 5 },
] satisfies DailyTrend[]

export type UsageTrendChartProps = {
  data?: DailyTrend[]
  className?: string
}

function formatDateLabel(value: string) {
  const date = new Date(value)
  if (Number.isNaN(date.getTime())) {
    return value
  }

  return date.toLocaleDateString(undefined, {
    month: 'short',
    day: 'numeric',
  })
}

export function UsageTrendChart({ data, className }: UsageTrendChartProps) {
  const usingFallback = !data
  const sourceData = usingFallback ? FALLBACK_USAGE_TREND : data ?? []
  const isEmpty = sourceData.length === 0

  const chartData = sourceData.map((point) => ({
    ...point,
    label: formatDateLabel(point.date),
  }))

  if (isEmpty && !usingFallback) {
    return (
      <Card className={className}>
        <CardHeader className="pb-2">
          <CardTitle className="text-base">Usage trends</CardTitle>
          <CardDescription>Used vs wasted items over time.</CardDescription>
        </CardHeader>
        <CardContent>
          <Empty className="h-[260px]">
            <EmptyHeader>
              <EmptyTitle>No trend data yet</EmptyTitle>
              <EmptyDescription>
                Usage trends will appear here once there is activity
                for the selected range.
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
        <CardTitle className="text-base">Usage trends</CardTitle>
        <CardDescription>Used vs wasted items over time.</CardDescription>
      </CardHeader>
      <CardContent>
        <ChartContainer
          config={usageTrendConfig}
          className={cn('h-[260px]', 'mt-2')}
        >
          <LineChart
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
              cursor={{ stroke: 'hsl(var(--border))' }}
              contentStyle={{
                backgroundColor: 'hsl(var(--background))',
                borderRadius: 8,
                border: '1px solid hsl(var(--border))',
                fontSize: 12,
              }}
            />
            <Line
              type="monotone"
              dataKey="usedCount"
              stroke="var(--color-usedCount)"
              strokeWidth={2}
              dot={{ r: 2 }}
              name="Used"
            />
            <Line
              type="monotone"
              dataKey="wastedCount"
              stroke="var(--color-wastedCount)"
              strokeWidth={2}
              dot={{ r: 2 }}
              name="Wasted"
            />
          </LineChart>
        </ChartContainer>
      </CardContent>
    </Card>
  )
}
