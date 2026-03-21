/* @vitest-environment jsdom */

import { describe, it, expect, vi, beforeEach } from "vitest"
import { render, screen, fireEvent, waitFor } from "@testing-library/react"

import { AddDraftItemForm } from "../add-draft-item-form"

const CATEGORIES = [
  { id: "cat-dairy", name: "Dairy" },
  { id: "cat-bakery", name: "Bakery" },
]

function renderForm(onAdd = vi.fn()) {
  return { onAdd, ...render(<AddDraftItemForm categories={CATEGORIES} onAdd={onAdd} />) }
}

async function selectCategory(name: string) {
  const trigger = screen.getByRole("combobox")
  fireEvent.pointerDown(trigger, { button: 0, ctrlKey: false })
  fireEvent.click(trigger)
  fireEvent.click(await screen.findByRole("option", { name }))
}

describe("AddDraftItemForm validation", () => {
  beforeEach(() => {
    vi.restoreAllMocks()
    window.HTMLElement.prototype.scrollIntoView = vi.fn()
    window.HTMLElement.prototype.hasPointerCapture = vi.fn()
    window.HTMLElement.prototype.releasePointerCapture = vi.fn()
  })

  it("renders name, quantity, and category fields", () => {
    renderForm()

    expect(screen.getByLabelText("Item Name")).toBeInTheDocument()
    expect(screen.getByLabelText("Qty")).toBeInTheDocument()
    expect(screen.getByRole("combobox")).toBeInTheDocument()
  })

  it("shows an error when submitting with an empty name", async () => {
    renderForm()

    fireEvent.click(screen.getByRole("button", { name: /add item/i }))

    expect(await screen.findByRole("alert")).toHaveTextContent("Item name is required.")
  })

  it("shows an error when submitting with a whitespace-only name", async () => {
    renderForm()

    fireEvent.change(screen.getByLabelText("Item Name"), { target: { value: "   " } })
    fireEvent.click(screen.getByRole("button", { name: /add item/i }))

    expect(await screen.findByRole("alert")).toHaveTextContent("Item name is required.")
  })

  it("shows an error when no category is selected", async () => {
    renderForm()

    fireEvent.change(screen.getByLabelText("Item Name"), { target: { value: "Milk" } })
    fireEvent.click(screen.getByRole("button", { name: /add item/i }))

    expect(await screen.findByRole("alert")).toHaveTextContent("Please select a category.")
  })

  it("does not call onAdd when validation fails", async () => {
    const { onAdd } = renderForm()

    fireEvent.click(screen.getByRole("button", { name: /add item/i }))

    await screen.findByRole("alert")
    expect(onAdd).not.toHaveBeenCalled()
  })

  it("calls onAdd with trimmed name, quantity, and categoryId on valid submit", async () => {
    const { onAdd } = renderForm()

    fireEvent.change(screen.getByLabelText("Item Name"), { target: { value: "  Milk  " } })
    fireEvent.change(screen.getByLabelText("Qty"), { target: { value: "3" } })
    await selectCategory("Dairy")

    fireEvent.click(screen.getByRole("button", { name: /add item/i }))

    await waitFor(() => {
      expect(onAdd).toHaveBeenCalledOnce()
      expect(onAdd).toHaveBeenCalledWith({
        name: "Milk",
        quantity: 3,
        categoryId: "cat-dairy",
      })
    })
  })

  it("resets all fields after a successful submit", async () => {
    renderForm()

    fireEvent.change(screen.getByLabelText("Item Name"), { target: { value: "Bread" } })
    fireEvent.change(screen.getByLabelText("Qty"), { target: { value: "2" } })
    await selectCategory("Bakery")

    fireEvent.click(screen.getByRole("button", { name: /add item/i }))

    await waitFor(() => {
      expect(screen.getByLabelText<HTMLInputElement>("Item Name").value).toBe("")
      expect(screen.getByLabelText<HTMLInputElement>("Qty").value).toBe("1")
    })
  })

  it("clears the error message after a successful submit", async () => {
    renderForm()

    // Trigger an error first
    fireEvent.click(screen.getByRole("button", { name: /add item/i }))
    expect(await screen.findByRole("alert")).toBeInTheDocument()

    // Now fill everything in and submit successfully
    fireEvent.change(screen.getByLabelText("Item Name"), { target: { value: "Eggs" } })
    await selectCategory("Dairy")
    fireEvent.click(screen.getByRole("button", { name: /add item/i }))

    await waitFor(() => {
      expect(screen.queryByRole("alert")).not.toBeInTheDocument()
    })
  })

  it("defaults quantity to 1", () => {
    renderForm()

    const qtyInput = screen.getByLabelText<HTMLInputElement>("Qty")
    expect(qtyInput.value).toBe("1")
  })
})
