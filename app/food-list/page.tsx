"use client"

const mockItems = [
  { id: 1, name: "Milk", category: "Dairy", expiryDate: "2026-03-24", status: "expiring" },
  { id: 2, name: "Chicken Breast", category: "Meat", expiryDate: "2026-03-23", status: "expiring" },
  { id: 3, name: "Apple", category: "Fruit", expiryDate: "2026-03-30", status: "fresh" },
  { id: 4, name: "Yogurt", category: "Dairy", expiryDate: "2026-03-20", status: "expired" },
  { id: 5, name: "Bread", category: "Bakery", expiryDate: "2026-03-25", status: "fresh" },
]

const statusStyles: Record<string, string> = {
  fresh: "bg-green-100 text-green-800",
  expiring: "bg-yellow-100 text-yellow-800",
  expired: "bg-red-100 text-red-800",
}

export default function FoodListPage() {
  return (
    <div className="flex flex-col gap-4">
      <h1 className="text-2xl font-semibold tracking-tight">Food List</h1>
      <p className="text-sm text-muted-foreground">Your confirmed food items</p>

      <div className="flex flex-col gap-3">
        {mockItems.map((item) => (
          <div key={item.id} className="flex items-center justify-between rounded-lg border p-4">
            <div className="flex flex-col gap-1">
              <span className="font-medium">{item.name}</span>
              <span className="text-sm text-muted-foreground">{item.category}</span>
              <span className="text-sm text-muted-foreground">Expires: {item.expiryDate}</span>
            </div>
            <span className={`rounded-full px-3 py-1 text-xs font-medium ${statusStyles[item.status]}`}>
              {item.status}
            </span>
          </div>
        ))}
      </div>
    </div>
  )
}