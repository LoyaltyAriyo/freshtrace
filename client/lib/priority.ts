export type Priority = "use-first" | "use-soon" | "use-later"

export type ExpiryUrgency = "expired" | "critical" | "warning" | "ok" | "fresh"

const MS_PER_DAY = 1000 * 60 * 60 * 24

/**
 * Returns the number of whole days elapsed since the given date.
 */
export function getDaysStored(dateAdded: Date | string): number {
  const added = new Date(dateAdded)
  const now = new Date()
  return Math.floor((now.getTime() - added.getTime()) / MS_PER_DAY)
}

/**
 * Returns the number of days remaining before the item expires.
 * Negative values mean the item has already expired.
 */
export function getDaysLeft(dateAdded: Date | string, shelfLifeDays: number): number {
  return shelfLifeDays - getDaysStored(dateAdded)
}

/**
 * Calculates the priority level of a food item based on how much of its
 * shelf life has been consumed.
 *
 * Rules:
 *  - use-first : ≤ 33 % of shelf life remaining (or already expired)
 *  - use-soon  : 34 – 66 % remaining
 *  - use-later : > 66 % remaining
 */
export function calculatePriority(dateAdded: Date | string, shelfLifeDays: number): Priority {
  const daysLeft = getDaysLeft(dateAdded, shelfLifeDays)

  if (shelfLifeDays <= 0) return "use-first"

  const percentLeft = daysLeft / shelfLifeDays

  if (percentLeft <= 0.33) return "use-first"
  if (percentLeft <= 0.66) return "use-soon"
  return "use-later"
}

/**
 * Returns a fine-grained urgency label used for styling expiry text.
 *
 * expired  – past expiry date
 * critical – ≤ 1 day left
 * warning  – ≤ 33 % of shelf life remaining
 * ok       – ≤ 66 % remaining
 * fresh    – > 66 % remaining
 */
export function getExpiryUrgency(daysLeft: number, shelfLifeDays: number): ExpiryUrgency {
  if (daysLeft < 0) return "expired"
  if (daysLeft <= 1) return "critical"

  if (shelfLifeDays <= 0) return "critical"

  const percentLeft = daysLeft / shelfLifeDays
  if (percentLeft <= 0.33) return "warning"
  if (percentLeft <= 0.66) return "ok"
  return "fresh"
}

/**
 * Formats days left into a human-readable string.
 */
export function formatTimeLeft(daysLeft: number): string {
  if (daysLeft < 0) return `Expired ${Math.abs(daysLeft)}d ago`
  if (daysLeft === 0) return "Expires today"
  if (daysLeft === 1) return "1 day left"
  return `${daysLeft} days left`
}
