import { NextResponse } from "next/server";

const items = [
  { id: 1, name: "Milk", category: "Dairy", expiryDate: "2026-03-24", status: "expiring", severity: "medium" },
  { id: 2, name: "Chicken Breast", category: "Meat", expiryDate: "2026-03-23", status: "expiring", severity: "high" },
  { id: 3, name: "Apples", category: "Fruit", expiryDate: "2026-03-30", status: "fresh", severity: "low" },
  { id: 4, name: "Yogurt", category: "Dairy", expiryDate: "2026-03-20", status: "expired", severity: "high" },
  { id: 5, name: "Bread", category: "Bakery", expiryDate: "2026-03-25", status: "fresh", severity: "low" },
];

export async function GET(req: Request) {
  const { searchParams } = new URL(req.url);

  const category = searchParams.get("category");
  const severity = searchParams.get("severity"); // ✅ NEW
  const startDate = searchParams.get("startDate");
  const endDate = searchParams.get("endDate");

  let filtered = items;

  if (category) {
    filtered = filtered.filter((item) => item.category === category);
  }

  if (severity) {
    filtered = filtered.filter((item) => item.severity === severity);
  }

  if (startDate) {
    filtered = filtered.filter(
      (item) => new Date(item.expiryDate) >= new Date(startDate)
    );
  }

  if (endDate) {
    filtered = filtered.filter(
      (item) => new Date(item.expiryDate) <= new Date(endDate)
    );
  }

  return NextResponse.json(filtered);
}