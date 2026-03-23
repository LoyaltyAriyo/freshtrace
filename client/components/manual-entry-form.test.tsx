/* @vitest-environment jsdom */

import { beforeEach, describe, expect, it, vi } from "vitest"
import { fireEvent, render, screen, waitFor } from "@testing-library/react"

import { ManualEntryForm } from "./manual-entry-form"

const pushMock = vi.fn()

vi.mock("next/navigation", () => ({
  useRouter: () => ({ push: pushMock }),
}))

vi.mock("@/components/category-dropdown", () => ({
  CategoryDropdown: ({
    value,
    onValueChange,
    disabled,
  }: {
    value: string
    onValueChange: (v: string) => void
    disabled?: boolean
  }) => (
    <select
      aria-label="Category"
      value={value}
      onChange={(e) => onValueChange(e.target.value)}
      disabled={disabled}
      data-testid="category-select"
    >
      <option value="">Select category</option>
      <option value="cat-1">Dairy</option>
    </select>
  ),
}))

describe("ManualEntryForm", () => {
  beforeEach(() => {
    pushMock.mockReset()
    vi.stubGlobal("fetch", vi.fn())
  })

  function fillForm({ name = "Milk", quantity = "2", categoryId = "cat-1" } = {}) {
    fireEvent.change(screen.getByLabelText(/item name/i), { target: { value: name } })
    fireEvent.change(screen.getByLabelText(/quantity/i), { target: { value: quantity } })
    fireEvent.change(screen.getByTestId("category-select"), { target: { value: categoryId } })
  }

  it("renders the form fields", () => {
    render(<ManualEntryForm />)

    expect(screen.getByLabelText(/item name/i)).toBeInTheDocument()
    expect(screen.getByLabelText(/quantity/i)).toBeInTheDocument()
    expect(screen.getByTestId("category-select")).toBeInTheDocument()
    expect(screen.getByRole("button", { name: /save item/i })).toBeInTheDocument()
  })

  it("shows an error when name is empty on submit", async () => {
    render(<ManualEntryForm />)

    fireEvent.click(screen.getByRole("button", { name: /save item/i }))

    expect(await screen.findByText(/item name is required/i)).toBeInTheDocument()
  })

  it("shows an error when no category is selected on submit", async () => {
    render(<ManualEntryForm />)

    fireEvent.change(screen.getByLabelText(/item name/i), { target: { value: "Milk" } })
    fireEvent.click(screen.getByRole("button", { name: /save item/i }))

    expect(await screen.findByText(/please select a category/i)).toBeInTheDocument()
  })

  it("submits the form and redirects to /food-list on success", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue({
        ok: true,
        json: vi.fn().mockResolvedValue({ id: "item-1" }),
      }),
    )

    render(<ManualEntryForm />)
    fillForm()

    fireEvent.click(screen.getByRole("button", { name: /save item/i }))

    await waitFor(() => expect(pushMock).toHaveBeenCalledWith("/food-list"))

    expect(vi.mocked(fetch)).toHaveBeenCalledWith(
      "/api/items",
      expect.objectContaining({
        method: "POST",
        body: expect.stringContaining("Milk"),
      }),
    )
  })

  it("shows an error message when the API returns an error", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue({
        ok: false,
        json: vi.fn().mockResolvedValue({ error: "Failed to save item." }),
      }),
    )

    render(<ManualEntryForm />)
    fillForm()

    fireEvent.click(screen.getByRole("button", { name: /save item/i }))

    expect(await screen.findByText(/failed to save item/i)).toBeInTheDocument()
    expect(pushMock).not.toHaveBeenCalled()
  })
})
