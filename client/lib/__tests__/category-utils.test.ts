import { describe, it, expect, vi } from "vitest"
import {
  findCategoryIdForItemName,
  ensureCategories,
  DEFAULT_CATEGORIES,
} from "../category-utils"
import type { CategoryOption } from "../category-utils"

// ---------------------------------------------------------------------------
// Sample categories matching DEFAULT_CATEGORIES structure
// ---------------------------------------------------------------------------

const SAMPLE_CATEGORIES: CategoryOption[] = [
  { id: "cat-produce", name: "Produce", shelfLifeDays: 7 },
  { id: "cat-dairy", name: "Dairy", shelfLifeDays: 10 },
  { id: "cat-meat", name: "Meat", shelfLifeDays: 5 },
  { id: "cat-seafood", name: "Seafood", shelfLifeDays: 3 },
  { id: "cat-bakery", name: "Bakery", shelfLifeDays: 5 },
  { id: "cat-frozen", name: "Frozen", shelfLifeDays: 90 },
  { id: "cat-pantry", name: "Pantry", shelfLifeDays: 60 },
  { id: "cat-beverage", name: "Beverage", shelfLifeDays: 30 },
  { id: "cat-snacks", name: "Snacks", shelfLifeDays: 45 },
  { id: "cat-leftover", name: "Leftover", shelfLifeDays: 3 },
  { id: "cat-other", name: "Other", shelfLifeDays: 14 },
]

// ---------------------------------------------------------------------------
// DEFAULT_CATEGORIES
// ---------------------------------------------------------------------------

describe("DEFAULT_CATEGORIES", () => {
  it("includes all expected categories", () => {
    const names = DEFAULT_CATEGORIES.map((c) => c.name)
    expect(names).toContain("Produce")
    expect(names).toContain("Dairy")
    expect(names).toContain("Meat")
    expect(names).toContain("Seafood")
    expect(names).toContain("Bakery")
    expect(names).toContain("Frozen")
    expect(names).toContain("Pantry")
    expect(names).toContain("Beverage")
    expect(names).toContain("Snacks")
    expect(names).toContain("Leftover")
    expect(names).toContain("Other")
  })

  it("includes the Leftover category with 3-day shelf life", () => {
    const leftover = DEFAULT_CATEGORIES.find((c) => c.name === "Leftover")
    expect(leftover).toBeDefined()
    expect(leftover?.shelfLifeDays).toBe(3)
  })

  it("all categories have a positive shelf life", () => {
    for (const category of DEFAULT_CATEGORIES) {
      expect(category.shelfLifeDays).toBeGreaterThan(0)
    }
  })
})

// ---------------------------------------------------------------------------
// findCategoryIdForItemName
// ---------------------------------------------------------------------------

describe("findCategoryIdForItemName", () => {
  it("returns null for an empty item name", () => {
    expect(findCategoryIdForItemName("", SAMPLE_CATEGORIES)).toBeNull()
  })

  it("matches milk to Dairy", () => {
    expect(findCategoryIdForItemName("Whole Milk", SAMPLE_CATEGORIES)).toBe("cat-dairy")
  })

  it("matches chicken to Meat", () => {
    expect(findCategoryIdForItemName("Chicken Breast", SAMPLE_CATEGORIES)).toBe("cat-meat")
  })

  it("matches salmon to Seafood", () => {
    expect(findCategoryIdForItemName("Fresh Salmon", SAMPLE_CATEGORIES)).toBe("cat-seafood")
  })

  it("matches bread to Bakery", () => {
    expect(findCategoryIdForItemName("Sourdough Bread", SAMPLE_CATEGORIES)).toBe("cat-bakery")
  })

  it("matches frozen pizza to Frozen", () => {
    expect(findCategoryIdForItemName("Frozen Pizza", SAMPLE_CATEGORIES)).toBe("cat-frozen")
  })

  it("matches rice to Pantry", () => {
    expect(findCategoryIdForItemName("Basmati Rice", SAMPLE_CATEGORIES)).toBe("cat-pantry")
  })

  it("matches coffee to Beverage", () => {
    expect(findCategoryIdForItemName("Ground Coffee", SAMPLE_CATEGORIES)).toBe("cat-beverage")
  })

  it("matches chips to Snacks", () => {
    expect(findCategoryIdForItemName("Popcorn Snack", SAMPLE_CATEGORIES)).toBe("cat-snacks")
  })

  it("matches leftover to Leftover", () => {
    expect(findCategoryIdForItemName("Leftover Pasta", SAMPLE_CATEGORIES)).toBe("cat-leftover")
  })

  it("matches apple to Produce", () => {
    expect(findCategoryIdForItemName("Gala Apple", SAMPLE_CATEGORIES)).toBe("cat-produce")
  })

  it("returns null when no category matches", () => {
    expect(findCategoryIdForItemName("xyzzy unknown item", SAMPLE_CATEGORIES)).toBeNull()
  })

  it("is case-insensitive", () => {
    expect(findCategoryIdForItemName("WHOLE MILK", SAMPLE_CATEGORIES)).toBe("cat-dairy")
    expect(findCategoryIdForItemName("whole milk", SAMPLE_CATEGORIES)).toBe("cat-dairy")
  })

  it("returns null when categories list is empty", () => {
    expect(findCategoryIdForItemName("Milk", [])).toBeNull()
  })
})

// ---------------------------------------------------------------------------
// ensureCategories
// ---------------------------------------------------------------------------

describe("ensureCategories", () => {
  it("returns existing categories without seeding when categories exist", async () => {
    const findMany = vi.fn().mockResolvedValue(SAMPLE_CATEGORIES)
    const createMany = vi.fn()

    const result = await ensureCategories({ findMany, createMany })

    expect(result).toEqual(SAMPLE_CATEGORIES)
    expect(createMany).not.toHaveBeenCalled()
  })

  it("seeds default categories when DB is empty", async () => {
    const findMany = vi.fn()
      .mockResolvedValueOnce([])
      .mockResolvedValueOnce(SAMPLE_CATEGORIES)
    const createMany = vi.fn().mockResolvedValue({ count: DEFAULT_CATEGORIES.length })

    const result = await ensureCategories({ findMany, createMany })

    expect(createMany).toHaveBeenCalledWith({ data: DEFAULT_CATEGORIES })
    expect(result).toEqual(SAMPLE_CATEGORIES)
  })

  it("seeds the Leftover category when DB is empty", async () => {
    const findMany = vi.fn()
      .mockResolvedValueOnce([])
      .mockResolvedValueOnce(SAMPLE_CATEGORIES)
    const createMany = vi.fn().mockResolvedValue({ count: DEFAULT_CATEGORIES.length })

    await ensureCategories({ findMany, createMany })

    const seededData = createMany.mock.calls[0][0].data
    expect(seededData).toContainEqual(
      expect.objectContaining({ name: "Leftover", shelfLifeDays: 3 })
    )
  })

  it("returns existing categories even when createMany is undefined", async () => {
    const findMany = vi.fn().mockResolvedValue(SAMPLE_CATEGORIES)

    const result = await ensureCategories({ findMany })

    expect(result).toEqual(SAMPLE_CATEGORIES)
  })

  it("does not seed when createMany is not available", async () => {
    const findMany = vi.fn().mockResolvedValue([])

    const result = await ensureCategories({ findMany })

    expect(result).toEqual([])
  })
})
