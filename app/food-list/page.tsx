"use client";

import { useEffect, useState } from "react";

type Item = {
  id: number;
  name: string;
  category: string;
  expiryDate: string;
  status: "fresh" | "expiring" | "expired";
};

const statusStyles: Record<string, string> = {
  fresh: "bg-green-100 text-green-800",
  expiring: "bg-yellow-100 text-yellow-800",
  expired: "bg-red-100 text-red-800",
};

export default function FoodListPage() {
  const [items, setItems] = useState<Item[]>([]);
  const [category, setCategory] = useState("");
  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate] = useState("");

  const fetchItems = async () => {
    let url = "/api/items?";

    if (category) url += `category=${category}&`;
    if (startDate) url += `startDate=${startDate}&`;
    if (endDate) url += `endDate=${endDate}`;

    const res = await fetch(url);
    const data = await res.json();

    setItems(data);
  };

  // 🔥 fetch when filters change
  useEffect(() => {
    fetchItems();
  }, [category, startDate, endDate]);

  return (
    <div className="flex flex-col gap-4">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">Food List</h1>
        <p className="text-sm text-muted-foreground">
          Your confirmed food items
        </p>
      </div>

      {/* FILTERS */}
      <div className="flex flex-wrap gap-3">
        <select
          value={category}
          onChange={(e) => setCategory(e.target.value)}
          className="border rounded-md p-2 text-sm"
        >
          <option value="">All Categories</option>
          <option value="Dairy">Dairy</option>
          <option value="Meat">Meat</option>
          <option value="Fruit">Fruit</option>
          <option value="Bakery">Bakery</option>
        </select>

        <input
          type="date"
          value={startDate}
          onChange={(e) => setStartDate(e.target.value)}
          className="border rounded-md p-2 text-sm"
        />

        <input
          type="date"
          value={endDate}
          onChange={(e) => setEndDate(e.target.value)}
          className="border rounded-md p-2 text-sm"
        />

        <button
          onClick={() => {
            setCategory("");
            setStartDate("");
            setEndDate("");
          }}
          className="border px-3 py-2 rounded-md text-sm"
        >
          Reset
        </button>
      </div>

      {/* LIST */}
      <div className="flex flex-col gap-3">
        {items.length === 0 ? (
          <p className="text-sm text-muted-foreground">
            No items found.
          </p>
        ) : (
          items.map((item) => (
            <div
              key={item.id}
              className="flex items-center justify-between rounded-lg border p-4"
            >
              <div className="flex flex-col gap-1">
                <span className="font-medium">{item.name}</span>
                <span className="text-sm text-muted-foreground">
                  {item.category}
                </span>
                <span className="text-xs text-muted-foreground">
                  Expires: {item.expiryDate}
                </span>
              </div>

              <span
                className={`rounded-full px-3 py-1 text-xs font-medium ${statusStyles[item.status]}`}
              >
                {item.status}
              </span>
            </div>
          ))
        )}
      </div>
    </div>
  );
}