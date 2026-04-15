export type NotificationType = "warning" | "reminder" | "info"

export interface Notification {
  id: string
  message: string
  timestamp: string
  type: NotificationType
  read: boolean
}

export const CATEGORY_SHELF_LIFE: Record<string, number> = {
  Produce: 7,
  Meat: 3,
  Seafood: 2,
  Dairy: 10,
  Bakery: 5,
  Frozen: 90,
  Pantry: 60,
  Beverage: 30,
  Snacks: 45,
  Leftover: 3,
  Other: 14,
}

export function getShelfLife(categoryName: string): number {
  return CATEGORY_SHELF_LIFE[categoryName] ?? 7
}

export function getDaysStored(dateAdded: Date): number {
  return Math.floor((Date.now() - new Date(dateAdded).getTime()) / (1000 * 60 * 60 * 24))
}

export function getDaysLeft(dateAdded: Date, categoryName: string): number {
  const stored = getDaysStored(dateAdded)
  const shelfLife = getShelfLife(categoryName)
  return Math.max(0, shelfLife - stored)
}

/**
 * Determines the notification rule for an item based on days left and shelf life.
 * Returns null if no notification should be generated (item is still fresh).
 */
export function getNotificationRule(
  daysLeft: number,
  shelfLife: number
): NotificationType | null {
  if (daysLeft === 0) return "warning"
  if (daysLeft <= Math.ceil(shelfLife * 0.25)) return "reminder"
  if (daysLeft <= Math.ceil(shelfLife * 0.5)) return "info"
  return null
}

/**
 * Builds a notification object for a food item.
 * Returns null if the item does not meet any notification rule.
 */
export function buildNotification(item: {
  id: string
  name: string
  dateAdded: Date
  categoryName: string
}): Notification | null {
  const shelfLife = getShelfLife(item.categoryName)
  const daysLeft = getDaysLeft(item.dateAdded, item.categoryName)
  const type = getNotificationRule(daysLeft, shelfLife)

  if (!type) return null

  const messages: Record<NotificationType, string> = {
    warning: `${item.name} has expired — please discard it.`,
    reminder: `${item.name} should be used soon — only ${daysLeft} day${daysLeft === 1 ? "" : "s"} left.`,
    info: `${item.name} is approaching its use-by period — ${daysLeft} days left.`,
  }

  const prefixes: Record<NotificationType, string> = {
    warning: "expired",
    reminder: "use-first",
    info: "use-soon",
  }

  return {
    id: `${prefixes[type]}-${item.id}`,
    message: messages[type],
    timestamp: new Date().toISOString(),
    type,
    read: false,
  }
}
