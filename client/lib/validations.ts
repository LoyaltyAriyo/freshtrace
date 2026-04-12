/**
 * Shared validation utilities for food item input fields.
 *
 * Used by the edit-item dialog and potentially by other forms
 * (manual entry, add draft item, etc.) that require the same rules.
 */

// ── constants ──────────────────────────────────────────────
export const ITEM_NAME_MAX_LENGTH = 100
export const ITEM_QUANTITY_MIN = 1
export const ITEM_QUANTITY_MAX = 9999

// ── error type ─────────────────────────────────────────────
export type ItemFieldErrors = {
  name?: string
  quantity?: string
  categoryId?: string
}

// ── helpers ────────────────────────────────────────────────

/**
 * Validate a food-item name.
 *
 * Rules:
 * - Must not be empty after trimming
 * - Must not exceed {@link ITEM_NAME_MAX_LENGTH} characters
 */
export function validateItemName(raw: string): string | undefined {
  const trimmed = raw.trim()
  if (!trimmed) {
    return "Item name is required."
  }
  if (trimmed.length > ITEM_NAME_MAX_LENGTH) {
    return `Item name must be ${ITEM_NAME_MAX_LENGTH} characters or fewer.`
  }
  return undefined
}

/**
 * Validate a quantity value coming from a text input.
 *
 * Rules:
 * - Must not be empty
 * - Must be a finite integer
 * - Must be between {@link ITEM_QUANTITY_MIN} and {@link ITEM_QUANTITY_MAX}
 */
export function validateItemQuantity(raw: string): string | undefined {
  const trimmed = raw.trim()
  if (trimmed === "") {
    return "Quantity is required."
  }

  const parsed = Number(trimmed)
  if (!Number.isFinite(parsed) || !Number.isInteger(parsed)) {
    return "Quantity must be a whole number."
  }

  if (parsed < ITEM_QUANTITY_MIN) {
    return `Quantity must be at least ${ITEM_QUANTITY_MIN}.`
  }

  if (parsed > ITEM_QUANTITY_MAX) {
    return `Quantity must be ${ITEM_QUANTITY_MAX} or fewer.`
  }

  return undefined
}

/**
 * Validate that a category has been selected.
 */
export function validateItemCategoryId(value: string): string | undefined {
  if (!value.trim()) {
    return "Please select a category."
  }
  return undefined
}

// ── composite validator ────────────────────────────────────

/**
 * Validate all editable food-item fields at once.
 *
 * @returns An object containing per-field error messages, or `null` when
 *          every field is valid.
 */
export function validateFoodItemInput(
  name: string,
  quantityInput: string,
  categoryId: string,
): ItemFieldErrors | null {
  const errors: ItemFieldErrors = {}

  const nameError = validateItemName(name)
  if (nameError) errors.name = nameError

  const quantityError = validateItemQuantity(quantityInput)
  if (quantityError) errors.quantity = quantityError

  const categoryError = validateItemCategoryId(categoryId)
  if (categoryError) errors.categoryId = categoryError

  return Object.keys(errors).length > 0 ? errors : null
}
