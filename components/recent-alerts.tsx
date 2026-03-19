"use client"

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import type { Alert } from "@/lib/data"
import { formatRelativeTime } from "@/lib/data"
import { cn } from "@/lib/utils"
import { Bell, AlertTriangle, Info } from "lucide-react"

const alertIcons = {
  reminder: Bell,
  warning: AlertTriangle,
  info: Info,
}

const alertStyles = {
  reminder: "text-primary",
  warning: "text-destructive",
  info: "text-muted-foreground",
}

export function RecentAlerts({ alerts }: { alerts: Alert[] }) {
  const recent = alerts.slice(0, 4)

  return (
    <Card>
      <CardHeader className="pb-3">
        <CardTitle className="flex items-center gap-2 text-base">
          <Bell className="h-4 w-4" />
          Recent Alerts
        </CardTitle>
      </CardHeader>
      <CardContent>
        {recent.length === 0 ? (
          <p className="text-sm text-muted-foreground">No recent alerts</p>
        ) : (
          <div className="flex flex-col gap-3">
            {recent.map((alert) => {
              const Icon = alertIcons[alert.type]
              return (
                <div
                  key={alert.id}
                  className={cn(
                    "flex items-start gap-3 rounded-lg border border-border px-3 py-2.5",
                    !alert.read && "bg-accent/50"
                  )}
                >
                  <Icon className={cn("mt-0.5 h-4 w-4 shrink-0", alertStyles[alert.type])} />
                  <div className="flex-1">
                    <p className="text-sm text-foreground leading-relaxed">{alert.message}</p>
                    <p className="mt-0.5 text-xs text-muted-foreground">
                      {formatRelativeTime(alert.timestamp)}
                    </p>
                  </div>
                  {!alert.read && (
                    <span className="mt-1 h-2 w-2 shrink-0 rounded-full bg-primary" />
                  )}
                </div>
              )
            })}
          </div>
        )}
      </CardContent>
    </Card>
  )
}
