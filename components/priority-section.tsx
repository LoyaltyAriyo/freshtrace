"use client"

import { Badge } from "@/components/ui/badge"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import type { FoodItem, Priority } from "@/lib/data"
import { getDaysStored, getDaysLeft, formatTimeLeft, getShelfLifeDays, getExpiryUrgency } from "@/lib/data"
import { cn } from "@/lib/utils"
import { AlertTriangle, Clock, Timer } from "lucide-react"

const urgencyStyles: Record<string, string> = {
  expired: "text-destructive font-semibold",
  critical: "text-destructive font-medium",
  warning: "text-warning-foreground font-medium",
  ok: "text-muted-foreground",
  fresh: "text-primary",
}

const priorityConfig: Record<Priority, { label: string; icon: React.ElementType; cardClass: string; badgeClass: string }> = {
  "use-first": {
    label: "Use First",
    icon: AlertTriangle,
    cardClass: "border-destructive/30 bg-destructive/5",
    badgeClass: "bg-destructive/15 text-destructive border-destructive/20",
  },
  "use-soon": {
    label: "Use Soon",
    icon: Timer,
    cardClass: "border-warning/30 bg-warning/5",
    badgeClass: "bg-warning/15 text-warning-foreground border-warning/20",
  },
  "use-later": {
    label: "Use Later",
    icon: Clock,
    cardClass: "border-primary/20 bg-primary/5",
    badgeClass: "bg-primary/10 text-primary border-primary/20",
  },
}

const categoryColors: Record<string, string> = {
  produce: "bg-chart-1/15 text-chart-1 border-chart-1/20",
  dairy: "bg-chart-2/15 text-chart-2 border-chart-2/20",
  meat: "bg-chart-4/15 text-chart-4 border-chart-4/20",
  leftovers: "bg-chart-5/15 text-chart-5 border-chart-5/20",
  pantry: "bg-chart-3/15 text-chart-3 border-chart-3/20",
  other: "bg-muted text-muted-foreground border-border",
}

export function PrioritySection({
  priority,
  items,
}: {
  priority: Priority
  items: FoodItem[]
}) {
  const config = priorityConfig[priority]
  const Icon = config.icon

  return (
    <Card className={cn("transition-all", config.cardClass)}>
      <CardHeader className="pb-3">
        <CardTitle className="flex items-center gap-2 text-base">
          <Icon className="h-4 w-4" />
          {config.label}
          <Badge variant="outline" className={cn("ml-auto text-xs", config.badgeClass)}>
            {items.length} {items.length === 1 ? "item" : "items"}
          </Badge>
        </CardTitle>
      </CardHeader>
      <CardContent>
        {items.length === 0 ? (
          <p className="text-sm text-muted-foreground">No items in this category</p>
        ) : (
          <div className="flex flex-col gap-2">
            {items.map((item) => {
              const daysLeft = getDaysLeft(item.addedDate, item.name, item.category)
              const shelfLife = getShelfLifeDays(item.name, item.category)
              const urgency = getExpiryUrgency(daysLeft, shelfLife)
              const timeLeftText = formatTimeLeft(daysLeft)

              return (
                <div
                  key={item.id}
                  className="flex flex-col gap-1 rounded-lg bg-card/80 px-3 py-2 sm:flex-row sm:items-center sm:justify-between"
                >
                  <div className="flex items-center gap-2 min-w-0">
                    <span className="text-sm font-medium text-foreground truncate">{item.name}</span>
                    <Badge variant="outline" className={cn("text-[10px] px-1.5 py-0 shrink-0", categoryColors[item.category])}>
                      {item.category}
                    </Badge>
                  </div>
                  <div className="flex items-center gap-3 text-xs shrink-0">
                    <span className="text-muted-foreground">
                      {getDaysStored(item.addedDate)}d stored
                    </span>
                    <span className={cn("whitespace-nowrap", urgencyStyles[urgency])}>
                      {timeLeftText}
                    </span>
                  </div>
                </div>
              )
            })}
          </div>
        )}
      </CardContent>
    </Card>
  )
}
