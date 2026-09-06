export type HistoryStatus = "USED" | "WASTED"

export type ItemHistoryEntry = {
  id: string
  foodItemId: string
  name: string
  quantity: number
  categoryId: string
  categoryName: string
  dateAdded: string | null
} & (
  | { status: "USED"; usedAt: string; wastedAt: null }
  | { status: "WASTED"; usedAt: null; wastedAt: string }
)

export type ItemHistoryResponse = {
  items: ItemHistoryEntry[]
  pagination: {
    limit: number
    hasMore: boolean
    nextCursor: string | null
  }
}
