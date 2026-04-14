export type Category = "produce" | "dairy" | "meat" | "leftovers" | "pantry" | "other"
export type Priority = "use-first" | "use-soon" | "use-later"
export type Status = "active" | "used" | "wasted"

export interface FoodItem {
  id: string
  name: string
  category: Category
  quantity?: string
  addedDate: string
  priority: Priority
  status: Status
}

export interface Alert {
  id: string
  message: string
  timestamp: string
  type: "reminder" | "warning" | "info"
  read: boolean
}
export type ErrorSeverity = "low" | "medium" | "high" | "critical"

export interface ErrorLogEntry {
  id: string
  timestamp: string
  severity: ErrorSeverity
  errorType: string
  sourceComponent: string
  message: string
  details: string
}
export const CATEGORIES: { value: Category; label: string }[] = [
  { value: "produce", label: "Produce" },
  { value: "dairy", label: "Dairy" },
  { value: "meat", label: "Meat" },
  { value: "leftovers", label: "Leftovers" },
  { value: "pantry", label: "Pantry" },
  { value: "other", label: "Other" },
]

export const PRIORITIES: { value: Priority; label: string }[] = [
  { value: "use-first", label: "Use First" },
  { value: "use-soon", label: "Use Soon" },
  { value: "use-later", label: "Use Later" },
]

function daysAgo(n: number): string {
  const d = new Date()
  d.setDate(d.getDate() - n)
  return d.toISOString()
}

export const sampleFoodItems: FoodItem[] = [
  { id: "1", name: "Strawberries", category: "produce", quantity: "1 pint", addedDate: daysAgo(6), priority: "use-first", status: "active" },
  { id: "2", name: "Greek Yogurt", category: "dairy", quantity: "2 cups", addedDate: daysAgo(5), priority: "use-first", status: "active" },
  { id: "3", name: "Chicken Breast", category: "meat", quantity: "1.5 lbs", addedDate: daysAgo(3), priority: "use-first", status: "active" },
  { id: "4", name: "Baby Spinach", category: "produce", quantity: "1 bag", addedDate: daysAgo(4), priority: "use-soon", status: "active" },
  { id: "5", name: "Cheddar Cheese", category: "dairy", quantity: "8 oz block", addedDate: daysAgo(7), priority: "use-soon", status: "active" },
  { id: "6", name: "Leftover Pasta", category: "leftovers", addedDate: daysAgo(2), priority: "use-soon", status: "active" },
  { id: "7", name: "Avocados", category: "produce", quantity: "3", addedDate: daysAgo(3), priority: "use-soon", status: "active" },
  { id: "8", name: "Butter", category: "dairy", quantity: "1 stick", addedDate: daysAgo(10), priority: "use-later", status: "active" },
  { id: "9", name: "Rice", category: "pantry", quantity: "2 lbs", addedDate: daysAgo(14), priority: "use-later", status: "active" },
  { id: "10", name: "Eggs", category: "dairy", quantity: "12 count", addedDate: daysAgo(4), priority: "use-later", status: "active" },
  { id: "11", name: "Bell Peppers", category: "produce", quantity: "4", addedDate: daysAgo(5), priority: "use-later", status: "active" },
  { id: "12", name: "Ground Turkey", category: "meat", quantity: "1 lb", addedDate: daysAgo(2), priority: "use-later", status: "active" },
]

export const sampleAlerts: Alert[] = [
  { id: "a1", message: "Strawberries have been stored for 6 days", timestamp: daysAgo(0), type: "warning", read: false },
  { id: "a2", message: "Chicken Breast is in the Use First zone", timestamp: daysAgo(0), type: "reminder", read: false },
  { id: "a3", message: "Greek Yogurt stored for 5 days - check freshness", timestamp: daysAgo(1), type: "warning", read: false },
  { id: "a4", message: "Baby Spinach moved to Use Soon", timestamp: daysAgo(1), type: "info", read: true },
  { id: "a5", message: "Weekly summary: 2 items used, 0 wasted", timestamp: daysAgo(3), type: "info", read: true },
  { id: "a6", message: "Leftover Pasta added 2 days ago", timestamp: daysAgo(2), type: "reminder", read: true },
]

export const sampleErrorLogs: ErrorLogEntry[] = [
  { id: "e1", timestamp: daysAgo(0),severity: "high", errorType: "OCR_FAILURE", sourceComponent: "ReceiptScanner", message: "Failed to parse receipt image", details: "The uploaded image was too blurry for text extraction. Confidence score: 12%. Minimum required: 40%. User was shown error message and prompted to retry with a clearer image." },
  { id: "e2", timestamp: daysAgo(1),severity: "medium", errorType: "VALIDATION_ERROR", sourceComponent: "ManualEntry", message: "Invalid category value submitted", details: "User submitted form with category value 'frozen' which is not in the allowed enum. Form validation caught the error client-side. No data was persisted." },
  { id: "e3", timestamp: daysAgo(2),severity: "high", errorType: "API_TIMEOUT", sourceComponent: "ReceiptProcessor", message: "Receipt processing API timed out after 30s", details: "External OCR API did not respond within the 30-second timeout window. Request ID: req_abc123. The receipt was queued for retry and processed successfully on second attempt." },
  { id: "e4", timestamp: daysAgo(3),severity: "critical", errorType: "AUTH_ERROR", sourceComponent: "HouseholdSync", message: "Household sync failed - invalid token", details: "JWT token expired during a long-running sync operation. Token was issued 25 hours ago, exceeding the 24-hour validity window. User session was refreshed automatically." },
  { id: "e5", timestamp: daysAgo(5),severity: "medium", errorType: "DB_ERROR", sourceComponent: "FoodItemStore", message: "Duplicate key constraint violation", details: "Attempted to insert food item with ID 'fi_xyz789' which already exists. This occurred during a retry after a network interruption. The existing record was kept unchanged." },
]

export function getDaysStored(addedDate: string): number {
  const added = new Date(addedDate)
  const now = new Date()
  return Math.floor((now.getTime() - added.getTime()) / (1000 * 60 * 60 * 24))
}

export function formatRelativeTime(dateStr: string): string {
  const days = getDaysStored(dateStr)
  if (days === 0) return "Today"
  if (days === 1) return "Yesterday"
  return `${days} days ago`
}

// ---- Shelf Life / Expiry Logic ----

// Typical shelf life in days by category + common item keywords
const SHELF_LIFE_RULES: { keywords: string[]; category?: Category; days: number }[] = [
  // Produce - specific items
  { keywords: ["strawberr"], days: 5 },
  { keywords: ["berr", "blueberr", "raspberr", "blackberr"], days: 5 },
  { keywords: ["banana"], days: 7 },
  { keywords: ["avocado"], days: 5 },
  { keywords: ["spinach", "lettuce", "arugula", "kale", "greens"], days: 5 },
  { keywords: ["bell pepper", "pepper"], days: 7 },
  { keywords: ["tomato"], days: 7 },
  { keywords: ["apple", "pear"], days: 21 },
  { keywords: ["carrot", "celery"], days: 14 },
  { keywords: ["broccoli", "cauliflower"], days: 5 },
  { keywords: ["onion"], days: 30 },
  { keywords: ["potato"], days: 21 },
  { keywords: ["lemon", "lime", "citrus", "orange", "grapefruit"], days: 21 },
  // Dairy
  { keywords: ["milk", "whole milk", "oat milk", "almond milk"], days: 7 },
  { keywords: ["yogurt", "yoghurt"], days: 14 },
  { keywords: ["cream cheese", "crm chz", "soft cheese", "brie", "ricotta"], days: 14 },
  { keywords: ["cheddar", "hard cheese", "parmesan", "gruyere", "gouda"], days: 28 },
  { keywords: ["butter"], days: 30 },
  { keywords: ["egg"], days: 28 },
  // Meat & Seafood
  { keywords: ["chicken"], days: 2 },
  { keywords: ["ground turkey", "ground beef", "ground"], days: 2 },
  { keywords: ["steak", "beef"], days: 5 },
  { keywords: ["salmon", "fish", "shrimp", "seafood", "tuna"], days: 2 },
  { keywords: ["pork", "ham"], days: 5 },
  { keywords: ["bacon", "sausage"], days: 7 },
  // Leftovers
  { keywords: ["leftover", "pasta", "cooked", "soup", "stew"], category: "leftovers", days: 4 },
  // Pantry
  { keywords: ["bread", "sourdough", "bagel", "roll"], days: 7 },
  { keywords: ["rice", "pasta", "flour", "sugar", "cereal", "oats"], days: 365 },
  { keywords: ["canned", "can of", "beans"], days: 730 },
  { keywords: ["sauce", "ketchup", "mustard", "mayo"], days: 60 },
  { keywords: ["oil", "olive oil", "vinegar"], days: 365 },
  { keywords: ["nut", "almond", "walnut", "peanut"], days: 90 },
]

// Fallback shelf life by category
const CATEGORY_SHELF_LIFE: Record<Category, number> = {
  produce: 7,
  dairy: 14,
  meat: 3,
  leftovers: 4,
  pantry: 180,
  other: 14,
}

export function getShelfLifeDays(name: string, category: Category): number {
  const lower = name.toLowerCase()
  for (const rule of SHELF_LIFE_RULES) {
    if (rule.category && rule.category !== category) continue
    if (rule.keywords.some((kw) => lower.includes(kw))) {
      return rule.days
    }
  }
  return CATEGORY_SHELF_LIFE[category]
}

export function getDaysLeft(addedDate: string, name: string, category: Category): number {
  const stored = getDaysStored(addedDate)
  const shelfLife = getShelfLifeDays(name, category)
  return Math.max(0, shelfLife - stored)
}

export function formatTimeLeft(daysLeft: number): string {
  if (daysLeft <= 0) return "Expired"
  if (daysLeft === 1) return "1 day left"
  if (daysLeft < 7) return `${daysLeft} days left`
  if (daysLeft < 14) return "1 week left"
  if (daysLeft < 30) {
    const weeks = Math.floor(daysLeft / 7)
    return `${weeks} week${weeks > 1 ? "s" : ""} left`
  }
  if (daysLeft < 60) return "1 month left"
  if (daysLeft < 365) {
    const months = Math.floor(daysLeft / 30)
    return `${months} month${months > 1 ? "s" : ""} left`
  }
  const years = Math.floor(daysLeft / 365)
  return `${years} year${years > 1 ? "s" : ""} left`
}

export type ExpiryUrgency = "expired" | "critical" | "warning" | "ok" | "fresh"

export function getExpiryUrgency(daysLeft: number, shelfLifeDays: number): ExpiryUrgency {
  if (daysLeft <= 0) return "expired"
  const pctLeft = daysLeft / shelfLifeDays
  if (pctLeft <= 0.15) return "critical"
  if (pctLeft <= 0.35) return "warning"
  if (pctLeft <= 0.6) return "ok"
  return "fresh"
}
