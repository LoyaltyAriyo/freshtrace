/* @vitest-environment jsdom */

import { beforeEach, describe, expect, it, vi } from "vitest"
import { fireEvent, render, screen, waitFor } from "@testing-library/react"

import FoodListPage from "./page"

const getSearchParamMock = vi.fn()

vi.mock("next/navigation", () => ({
  useSearchParams: () => ({
    get: getSearchParamMock,
  }),
}))

describe("FoodListPage success confirmation", () => {
  beforeEach(() => {
    getSearchParamMock.mockReset()
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue({
        ok: true,
        json: vi.fn().mockResolvedValue([]),
      }),
    )
  })

  it("shows a success message after redirect from receipt review", async () => {
    getSearchParamMock.mockImplementation((key: string) => {
      if (key === "saved") return "1"
      if (key === "count") return "2"
      return null
    })

    render(<FoodListPage />)

    const banner = await screen.findByTestId("save-success")
    expect(banner).toHaveTextContent("Items saved")
    expect(banner).toHaveTextContent("2 items saved to your food list successfully.")
  })

  it("does not show success message when no success query params are present", async () => {
    getSearchParamMock.mockReturnValue(null)

    render(<FoodListPage />)

    await screen.findByText("No items found")
    expect(screen.queryByTestId("save-success")).not.toBeInTheDocument()
  })

  it("renders items returned from the API", async () => {
    getSearchParamMock.mockReturnValue(null)
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue({
        ok: true,
        json: vi.fn().mockResolvedValue([
          {
            id: "item-1",
            name: "Banana",
            quantity: 4,
            categoryId: "cat-produce",
            categoryName: "Produce",
            dateAdded: "2026-03-22T00:00:00.000Z",
            priority: "use-soon",
          },
        ]),
      }),
    )

    render(<FoodListPage />)

    expect(await screen.findByText("Banana")).toBeInTheDocument()
    expect(screen.getByText("Qty: 4")).toBeInTheDocument()
    expect(screen.getByText("Produce")).toBeInTheDocument()
  })

  it("marks an item as used and refreshes the list", async () => {
    getSearchParamMock.mockReturnValue(null)

    const fetchMock = vi
      .fn()
      // Initial GET /api/items
      .mockResolvedValueOnce({
        ok: true,
        json: vi.fn().mockResolvedValue([
          {
            id: "item-1",
            name: "Milk",
            quantity: 1,
            categoryId: "cat-dairy",
            categoryName: "Dairy",
            dateAdded: "2026-03-22T00:00:00.000Z",
            priority: "use-soon",
          },
        ]),
      })
      // POST /api/items/item-1/used
      .mockResolvedValueOnce({
        ok: true,
        json: vi.fn().mockResolvedValue({ id: "item-1", status: "USED", changed: true }),
      })
      // Refresh GET /api/items after update
      .mockResolvedValueOnce({
        ok: true,
        json: vi.fn().mockResolvedValue([]),
      })

    vi.stubGlobal("fetch", fetchMock)

    render(<FoodListPage />)

    expect(await screen.findByText("Milk")).toBeInTheDocument()

    fireEvent.click(screen.getByRole("button", { name: "Used" }))

    await waitFor(() => {
      expect(fetchMock).toHaveBeenCalledWith("/api/items/item-1/used", { method: "POST" })
    })

    expect(await screen.findByText("No items found")).toBeInTheDocument()
  })

  it("marks an item as wasted and refreshes the list", async () => {
    getSearchParamMock.mockReturnValue(null)

    const fetchMock = vi
      .fn()
      // Initial GET /api/items
      .mockResolvedValueOnce({
        ok: true,
        json: vi.fn().mockResolvedValue([
          {
            id: "item-2",
            name: "Bread",
            quantity: 1,
            categoryId: "cat-pantry",
            categoryName: "Pantry",
            dateAdded: "2026-03-22T00:00:00.000Z",
            priority: "use-later",
          },
        ]),
      })
      // POST /api/items/item-2/wasted
      .mockResolvedValueOnce({
        ok: true,
        json: vi.fn().mockResolvedValue({ id: "item-2", status: "WASTED", changed: true }),
      })
      // Refresh GET /api/items after update
      .mockResolvedValueOnce({
        ok: true,
        json: vi.fn().mockResolvedValue([]),
      })

    vi.stubGlobal("fetch", fetchMock)

    render(<FoodListPage />)

    expect(await screen.findByText("Bread")).toBeInTheDocument()

    fireEvent.click(screen.getByRole("button", { name: "Wasted" }))

    await waitFor(() => {
      expect(fetchMock).toHaveBeenCalledWith("/api/items/item-2/wasted", { method: "POST" })
    })

    expect(await screen.findByText("No items found")).toBeInTheDocument()
  })

  it("shows a success message after editing an item", async () => {
    getSearchParamMock.mockReturnValue(null)

    const updatedRow = {
      id: "item-1",
      name: "Banana",
      quantity: 4,
      categoryId: "cat-produce",
      categoryName: "Produce",
      dateAdded: "2026-03-22T00:00:00.000Z",
      priority: "use-soon" as const,
    }

    const fetchMock = vi
      .fn()
      .mockResolvedValueOnce({
        ok: true,
        json: vi.fn().mockResolvedValue([updatedRow]),
      })
      .mockResolvedValueOnce({
        ok: true,
        json: vi.fn().mockResolvedValue([{ id: "cat-produce", name: "Produce" }]),
      })
      .mockResolvedValueOnce({
        ok: true,
        json: vi.fn().mockResolvedValue({
          id: "item-1",
          name: "Banana",
          quantity: 4,
          categoryId: "cat-produce",
          category: { name: "Produce" },
        }),
      })
      .mockResolvedValueOnce({
        ok: true,
        json: vi.fn().mockResolvedValue([updatedRow]),
      })

    vi.stubGlobal("fetch", fetchMock)

    render(<FoodListPage />)

    expect(await screen.findByText("Banana")).toBeInTheDocument()

    fireEvent.click(screen.getByRole("button", { name: "Edit" }))

    await waitFor(() => {
      expect(screen.getByRole("button", { name: "Save changes" })).toBeInTheDocument()
    })

    fireEvent.click(screen.getByRole("button", { name: "Save changes" }))

    const success = await screen.findByTestId("edit-item-success")
    expect(success).toHaveTextContent("Changes saved")
    expect(success).toHaveTextContent("Banana")

    await waitFor(() => {
      expect(fetchMock).toHaveBeenCalledWith(
        "/api/items/item-1",
        expect.objectContaining({
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
        }),
      )
    })
  })

  it("shows an error message when saving edits fails", async () => {
    getSearchParamMock.mockReturnValue(null)

    const fetchMock = vi
      .fn()
      .mockResolvedValueOnce({
        ok: true,
        json: vi.fn().mockResolvedValue([
          {
            id: "item-1",
            name: "Milk",
            quantity: 1,
            categoryId: "cat-dairy",
            categoryName: "Dairy",
            dateAdded: "2026-03-22T00:00:00.000Z",
            priority: "use-soon",
          },
        ]),
      })
      .mockResolvedValueOnce({
        ok: true,
        json: vi.fn().mockResolvedValue([{ id: "cat-dairy", name: "Dairy" }]),
      })
      .mockResolvedValueOnce({
        ok: false,
        json: vi.fn().mockResolvedValue({ error: "Item name is required." }),
      })

    vi.stubGlobal("fetch", fetchMock)

    render(<FoodListPage />)

    expect(await screen.findByText("Milk")).toBeInTheDocument()

    fireEvent.click(screen.getByRole("button", { name: "Edit" }))

    await waitFor(() => {
      expect(screen.getByRole("button", { name: "Save changes" })).toBeInTheDocument()
    })

    fireEvent.click(screen.getByRole("button", { name: "Save changes" }))

    const errorAlert = await screen.findByTestId("edit-dialog-error")
    expect(errorAlert).toHaveTextContent("Could not save changes")
    expect(errorAlert).toHaveTextContent("Item name is required.")

    // Dialog stays open so the user can fix the issue
    expect(screen.getByRole("button", { name: "Save changes" })).toBeInTheDocument()
  })

  it("does not call PATCH when the name is blank after client validation", async () => {
    getSearchParamMock.mockReturnValue(null)

    const fetchMock = vi
      .fn()
      .mockResolvedValueOnce({
        ok: true,
        json: vi.fn().mockResolvedValue([
          {
            id: "item-1",
            name: "Milk",
            quantity: 1,
            categoryId: "cat-dairy",
            categoryName: "Dairy",
            dateAdded: "2026-03-22T00:00:00.000Z",
            priority: "use-soon",
          },
        ]),
      })
      .mockResolvedValueOnce({
        ok: true,
        json: vi.fn().mockResolvedValue([{ id: "cat-dairy", name: "Dairy" }]),
      })

    vi.stubGlobal("fetch", fetchMock)

    render(<FoodListPage />)

    expect(await screen.findByText("Milk")).toBeInTheDocument()

    fireEvent.click(screen.getByRole("button", { name: "Edit" }))

    await waitFor(() => {
      expect(screen.getByRole("button", { name: "Save changes" })).toBeInTheDocument()
    })

    const callsAfterOpen = fetchMock.mock.calls.length

    fireEvent.change(screen.getByLabelText("Name"), { target: { value: "   " } })
    fireEvent.click(screen.getByRole("button", { name: "Save changes" }))

    expect(await screen.findByText("Item name is required.")).toBeInTheDocument()
    expect(fetchMock.mock.calls.length).toBe(callsAfterOpen)
  })

  it("does not call PATCH when quantity is invalid after client validation", async () => {
    getSearchParamMock.mockReturnValue(null)

    const fetchMock = vi
      .fn()
      .mockResolvedValueOnce({
        ok: true,
        json: vi.fn().mockResolvedValue([
          {
            id: "item-1",
            name: "Milk",
            quantity: 1,
            categoryId: "cat-dairy",
            categoryName: "Dairy",
            dateAdded: "2026-03-22T00:00:00.000Z",
            priority: "use-soon",
          },
        ]),
      })
      .mockResolvedValueOnce({
        ok: true,
        json: vi.fn().mockResolvedValue([{ id: "cat-dairy", name: "Dairy" }]),
      })

    vi.stubGlobal("fetch", fetchMock)

    render(<FoodListPage />)

    expect(await screen.findByText("Milk")).toBeInTheDocument()

    fireEvent.click(screen.getByRole("button", { name: "Edit" }))

    await waitFor(() => {
      expect(screen.getByRole("button", { name: "Save changes" })).toBeInTheDocument()
    })

    const callsAfterOpen = fetchMock.mock.calls.length

    fireEvent.change(screen.getByLabelText("Quantity"), { target: { value: "0" } })
    fireEvent.click(screen.getByRole("button", { name: "Save changes" }))

    expect(
      await screen.findByText("Quantity must be at least 1."),
    ).toBeInTheDocument()
    expect(fetchMock.mock.calls.length).toBe(callsAfterOpen)
  })

  it("auto-dismisses the success message after 5 seconds", async () => {
    vi.useFakeTimers({ shouldAdvanceTime: true })
    getSearchParamMock.mockReturnValue(null)

    const updatedRow = {
      id: "item-1",
      name: "Banana",
      quantity: 4,
      categoryId: "cat-produce",
      categoryName: "Produce",
      dateAdded: "2026-03-22T00:00:00.000Z",
      priority: "use-soon" as const,
    }

    const fetchMock = vi
      .fn()
      .mockResolvedValueOnce({
        ok: true,
        json: vi.fn().mockResolvedValue([updatedRow]),
      })
      .mockResolvedValueOnce({
        ok: true,
        json: vi.fn().mockResolvedValue([{ id: "cat-produce", name: "Produce" }]),
      })
      .mockResolvedValueOnce({
        ok: true,
        json: vi.fn().mockResolvedValue({
          id: "item-1",
          name: "Banana",
          quantity: 4,
          categoryId: "cat-produce",
          category: { name: "Produce" },
        }),
      })
      .mockResolvedValueOnce({
        ok: true,
        json: vi.fn().mockResolvedValue([updatedRow]),
      })

    vi.stubGlobal("fetch", fetchMock)

    render(<FoodListPage />)

    expect(await screen.findByText("Banana")).toBeInTheDocument()

    fireEvent.click(screen.getByRole("button", { name: "Edit" }))

    await waitFor(() => {
      expect(screen.getByRole("button", { name: "Save changes" })).toBeInTheDocument()
    })

    fireEvent.click(screen.getByRole("button", { name: "Save changes" }))

    const success = await screen.findByTestId("edit-item-success")
    expect(success).toBeInTheDocument()

    // Advance timer past the 5-second auto-dismiss
    await vi.advanceTimersByTimeAsync(5100)

    await waitFor(() => {
      expect(screen.queryByTestId("edit-item-success")).not.toBeInTheDocument()
    })

    vi.useRealTimers()
  })

  it("shows a network error inside the dialog when fetch throws", async () => {
    getSearchParamMock.mockReturnValue(null)

    const fetchMock = vi
      .fn()
      .mockResolvedValueOnce({
        ok: true,
        json: vi.fn().mockResolvedValue([
          {
            id: "item-1",
            name: "Milk",
            quantity: 1,
            categoryId: "cat-dairy",
            categoryName: "Dairy",
            dateAdded: "2026-03-22T00:00:00.000Z",
            priority: "use-soon",
          },
        ]),
      })
      .mockResolvedValueOnce({
        ok: true,
        json: vi.fn().mockResolvedValue([{ id: "cat-dairy", name: "Dairy" }]),
      })
      // Simulate network failure
      .mockRejectedValueOnce(new TypeError("Failed to fetch"))

    vi.stubGlobal("fetch", fetchMock)

    render(<FoodListPage />)

    expect(await screen.findByText("Milk")).toBeInTheDocument()

    fireEvent.click(screen.getByRole("button", { name: "Edit" }))

    await waitFor(() => {
      expect(screen.getByRole("button", { name: "Save changes" })).toBeInTheDocument()
    })

    fireEvent.click(screen.getByRole("button", { name: "Save changes" }))

    await waitFor(() => {
      expect(screen.getByTestId("edit-dialog-error")).toHaveTextContent("Unable to reach the server")
    })

    // Dialog stays open so user can retry
    expect(screen.getByRole("button", { name: "Save changes" })).toBeInTheDocument()
  })
})
