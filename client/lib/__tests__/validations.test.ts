import { describe, expect, it } from "vitest"
import {
  ITEM_NAME_MAX_LENGTH,
  ITEM_QUANTITY_MAX,
  ITEM_QUANTITY_MIN,
  validateFoodItemInput,
  validateItemCategoryId,
  validateItemName,
  validateItemQuantity,
} from "@/lib/validations"

// ── validateItemName ───────────────────────────────────────

describe("validateItemName", () => {
  it("returns an error when the name is empty", () => {
    expect(validateItemName("")).toBe("Item name is required.")
  })

  it("returns an error when the name is only whitespace", () => {
    expect(validateItemName("   ")).toBe("Item name is required.")
  })

  it("returns undefined for a valid name", () => {
    expect(validateItemName("Chicken Breast")).toBeUndefined()
  })

  it("returns undefined when name is exactly at max length", () => {
    const name = "a".repeat(ITEM_NAME_MAX_LENGTH)
    expect(validateItemName(name)).toBeUndefined()
  })

  it("returns an error when name exceeds max length", () => {
    const name = "a".repeat(ITEM_NAME_MAX_LENGTH + 1)
    expect(validateItemName(name)).toBe(
      `Item name must be ${ITEM_NAME_MAX_LENGTH} characters or fewer.`,
    )
  })
})

// ── validateItemQuantity ───────────────────────────────────

describe("validateItemQuantity", () => {
  it("returns an error when the input is empty", () => {
    expect(validateItemQuantity("")).toBe("Quantity is required.")
  })

  it("returns an error when the input is only whitespace", () => {
    expect(validateItemQuantity("   ")).toBe("Quantity is required.")
  })

  it("returns an error for non-numeric input", () => {
    expect(validateItemQuantity("abc")).toBe("Quantity must be a whole number.")
  })

  it("returns an error for decimal values", () => {
    expect(validateItemQuantity("1.5")).toBe("Quantity must be a whole number.")
  })

  it("returns an error when quantity is less than minimum", () => {
    expect(validateItemQuantity("0")).toBe(
      `Quantity must be at least ${ITEM_QUANTITY_MIN}.`,
    )
  })

  it("returns an error for negative numbers", () => {
    expect(validateItemQuantity("-3")).toBe(
      `Quantity must be at least ${ITEM_QUANTITY_MIN}.`,
    )
  })

  it("returns an error when quantity exceeds maximum", () => {
    expect(validateItemQuantity(String(ITEM_QUANTITY_MAX + 1))).toBe(
      `Quantity must be ${ITEM_QUANTITY_MAX} or fewer.`,
    )
  })

  it("returns undefined for a valid quantity", () => {
    expect(validateItemQuantity("5")).toBeUndefined()
  })

  it("returns undefined for quantity at minimum boundary", () => {
    expect(validateItemQuantity(String(ITEM_QUANTITY_MIN))).toBeUndefined()
  })

  it("returns undefined for quantity at maximum boundary", () => {
    expect(validateItemQuantity(String(ITEM_QUANTITY_MAX))).toBeUndefined()
  })
})

// ── validateItemCategoryId ─────────────────────────────────

describe("validateItemCategoryId", () => {
  it("returns an error when category is empty", () => {
    expect(validateItemCategoryId("")).toBe("Please select a category.")
  })

  it("returns an error when category is only whitespace", () => {
    expect(validateItemCategoryId("   ")).toBe("Please select a category.")
  })

  it("returns undefined for a valid category id", () => {
    expect(validateItemCategoryId("cat-123")).toBeUndefined()
  })
})

// ── validateFoodItemInput (composite) ──────────────────────

describe("validateFoodItemInput", () => {
  it("returns null when all fields are valid", () => {
    expect(validateFoodItemInput("Bananas", "3", "cat-1")).toBeNull()
  })

  it("returns errors for all fields when all are invalid", () => {
    const errors = validateFoodItemInput("", "", "")
    expect(errors).not.toBeNull()
    expect(errors?.name).toBeDefined()
    expect(errors?.quantity).toBeDefined()
    expect(errors?.categoryId).toBeDefined()
  })

  it("returns only the name error when name is missing", () => {
    const errors = validateFoodItemInput("", "2", "cat-1")
    expect(errors).not.toBeNull()
    expect(errors?.name).toBeDefined()
    expect(errors?.quantity).toBeUndefined()
    expect(errors?.categoryId).toBeUndefined()
  })

  it("returns only the quantity error when quantity is invalid", () => {
    const errors = validateFoodItemInput("Milk", "abc", "cat-1")
    expect(errors).not.toBeNull()
    expect(errors?.name).toBeUndefined()
    expect(errors?.quantity).toBeDefined()
    expect(errors?.categoryId).toBeUndefined()
  })

  it("returns only the category error when category is missing", () => {
    const errors = validateFoodItemInput("Eggs", "6", "")
    expect(errors).not.toBeNull()
    expect(errors?.name).toBeUndefined()
    expect(errors?.quantity).toBeUndefined()
    expect(errors?.categoryId).toBeDefined()
  })
})
