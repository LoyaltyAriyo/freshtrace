/* @vitest-environment jsdom */

import { afterEach, beforeEach, describe, expect, it, vi } from "vitest"
import { fireEvent, render, screen, waitFor } from "@testing-library/react"

import ReviewPage from "./page"

const pushMock = vi.fn()
const getSearchParamMock = vi.fn()

vi.mock("next/navigation", () => ({
  useRouter: () => ({
    push: pushMock,
  }),
  useSearchParams: () => ({
    get: getSearchParamMock,
  }),
}))

describe("ReviewPage", () => {
  beforeEach(() => {
    pushMock.mockReset()
    getSearchParamMock.mockReset()
  })

  afterEach(() => {
    vi.restoreAllMocks()
  })

  it("shows an error when receiptId query param is missing and does not fetch", async () => {
    getSearchParamMock.mockReturnValue(null)

    const fetchMock = vi.fn()
    vi.stubGlobal("fetch", fetchMock)

    render(<ReviewPage />)

    const alert = await screen.findByTestId("load-error")
    expect(alert).toHaveTextContent(/no receipt id was found/i)
    expect(fetchMock).not.toHaveBeenCalled()
    expect(
      screen.getByRole("button", { name: /go to scan/i }),
    ).toBeInTheDocument()
  })

  it("shows a retryable error when the review fetch fails", async () => {
    getSearchParamMock.mockReturnValue("receipt-123")

    const fetchMock = vi
      .fn()
      // First call: GET fails with 500
      .mockResolvedValueOnce({
        ok: false,
        status: 500,
        json: vi.fn().mockResolvedValue({ error: "Backend failure" }),
      } as unknown as Response)
      // Second call: GET succeeds with empty items
      .mockResolvedValueOnce({
        ok: true,
        status: 200,
        json: vi.fn().mockResolvedValue({
          id: "receipt-123",
          ocrStatus: "SUCCESS",
          imagePath: "uploads/receipt.jpg",
          draftItems: [],
        }),
      } as unknown as Response)

    vi.stubGlobal("fetch", fetchMock)

    render(<ReviewPage />)

    expect(await screen.findByTestId("load-error")).toHaveTextContent(
      /backend failure/i,
    )

    const retryButton = screen.getByRole("button", { name: /try again/i })
    fireEvent.click(retryButton)

    await waitFor(() => {
      expect(fetchMock).toHaveBeenCalledTimes(2)
    })

    expect(
      await screen.findByText(/no items were detected from this receipt/i),
    ).toBeInTheDocument()
  })

  it("shows an empty state when the receipt has no draft items", async () => {
    getSearchParamMock.mockReturnValue("receipt-123")

    const fetchMock = vi.fn().mockResolvedValue({
      ok: true,
      status: 200,
      json: vi.fn().mockResolvedValue({
        id: "receipt-123",
        ocrStatus: "PENDING",
        imagePath: "uploads/receipt.jpg",
        draftItems: [],
      }),
    } as unknown as Response)

    vi.stubGlobal("fetch", fetchMock)

    render(<ReviewPage />)

    expect(
      await screen.findByTestId("ocr-pending"),
    ).toHaveTextContent(
      /couldn'?t extract any items from this receipt yet/i,
    )

    const confirmButton = screen.getByRole("button", { name: /confirm items/i })
    expect(confirmButton).toBeDisabled()
  })

  it("normalizes malformed draft items safely", async () => {
    getSearchParamMock.mockReturnValue("receipt-123")

    const fetchMock = vi.fn().mockResolvedValue({
      ok: true,
      status: 200,
      json: vi.fn().mockResolvedValue({
        id: "receipt-123",
        ocrStatus: "SUCCESS",
        imagePath: null,
        draftItems: [
          // Missing name, non-numeric quantity, missing category, invalid confidence
          {
            id: "draft-1",
            quantity: "3",
            confidence: "0.9",
          },
          // Invalid id should be ignored entirely
          {
            id: null,
            name: "Should be skipped",
          },
        ],
      }),
    } as unknown as Response)

    vi.stubGlobal("fetch", fetchMock)

    render(<ReviewPage />)

    const items = await screen.findAllByTestId("draft-item")
    expect(items).toHaveLength(1)

    expect(
      items[0],
    ).toHaveTextContent("(Unnamed item)")
  })

  it("marks items with missing or suspicious data as needing review", async () => {
    getSearchParamMock.mockReturnValue("receipt-123")

    const fetchMock = vi.fn().mockResolvedValue({
      ok: true,
      status: 200,
      json: vi.fn().mockResolvedValue({
        id: "receipt-123",
        ocrStatus: "SUCCESS",
        imagePath: "uploads/receipt.jpg",
        draftItems: [
          {
            id: "draft-ok",
            name: "Milk",
            quantity: 2,
            categoryId: "cat-dairy",
            confidence: 0.95,
            isSelected: true,
          },
          {
            id: "draft-missing-name",
            name: "   ",
            quantity: 1,
            categoryId: "cat-other",
            confidence: 0.8,
            isSelected: true,
          },
          {
            id: "draft-low-confidence",
            name: "Mystery Item",
            quantity: 0,
            categoryId: null,
            confidence: 0.4,
            isSelected: true,
          },
        ],
      }),
    } as unknown as Response)

    vi.stubGlobal("fetch", fetchMock)

    render(<ReviewPage />)

    const items = await screen.findAllByTestId("draft-item")
    expect(items).toHaveLength(3)

    expect(items[0]).not.toHaveTextContent(/needs review/i)
    expect(items[1]).toHaveTextContent(/needs review/i)
    expect(items[2]).toHaveTextContent(/needs review/i)
    expect(items[2]).toHaveTextContent(/category has not been set/i)
    expect(items[2]).toHaveTextContent(/quantity should be at least 1/i)
    expect(items[2]).toHaveTextContent(/low scan confidence/i)
  })

  it("shows a validation error when confirming with no selected items", async () => {
    getSearchParamMock.mockReturnValue("receipt-123")

    const fetchMock = vi.fn().mockResolvedValue({
      ok: true,
      status: 200,
      json: vi.fn().mockResolvedValue({
        id: "receipt-123",
        ocrStatus: "SUCCESS",
        imagePath: "uploads/receipt.jpg",
        draftItems: [
          {
            id: "draft-1",
            name: "Milk",
            quantity: 2,
            categoryId: "cat-dairy",
            confidence: 0.9,
            isSelected: true,
          },
        ],
      }),
    } as unknown as Response)

    vi.stubGlobal("fetch", fetchMock)

    render(<ReviewPage />)

    // Wait for item to appear
    await screen.findByText("Milk")

    // Deselect the only item
    fireEvent.click(screen.getByLabelText("Select Milk"))

    const confirmButton = screen.getByRole("button", { name: /confirm items/i })
    expect(confirmButton).toBeEnabled()

    fireEvent.click(confirmButton)

    const errorAlert = await screen.findByTestId("save-error")
    expect(errorAlert).toHaveTextContent(
      /please select at least one item to save/i,
    )

    // Only the initial GET should have been called – no POST
    expect(fetchMock).toHaveBeenCalledTimes(1)
  })

  it("redirects to food list with success query params after saving selected items", async () => {
    getSearchParamMock.mockReturnValue("receipt-123")

    const fetchMock = vi
      .fn()
      .mockResolvedValueOnce({
        ok: true,
        status: 200,
        json: vi.fn().mockResolvedValue({
          id: "receipt-123",
          ocrStatus: "SUCCESS",
          imagePath: "uploads/receipt.jpg",
          draftItems: [
            {
              id: "draft-1",
              name: "Milk",
              quantity: 2,
              categoryId: "cat-dairy",
              confidence: 0.9,
              isSelected: true,
            },
          ],
        }),
      } as unknown as Response)
      .mockResolvedValueOnce({
        ok: true,
        status: 201,
        json: vi.fn().mockResolvedValue({ savedCount: 1 }),
      } as unknown as Response)

    vi.stubGlobal("fetch", fetchMock)

    render(<ReviewPage />)

    await screen.findByText("Milk")

    fireEvent.click(screen.getByRole("button", { name: /confirm items/i }))

    await waitFor(() => {
      expect(pushMock).toHaveBeenCalledWith("/food-list?saved=1&count=1")
    })
  })

  it("sends edited item fields in the save request", async () => {
    getSearchParamMock.mockReturnValue("receipt-123")

    const fetchMock = vi
      .fn()
      .mockResolvedValueOnce({
        ok: true,
        status: 200,
        json: vi.fn().mockResolvedValue({
          id: "receipt-123",
          ocrStatus: "SUCCESS",
          imagePath: "uploads/receipt.jpg",
          draftItems: [
            {
              id: "draft-1",
              name: "Milk",
              quantity: 1,
              categoryId: "cat-dairy",
              confidence: 0.9,
              isSelected: true,
            },
          ],
          categories: [
            { id: "cat-dairy", name: "Dairy" },
            { id: "cat-bakery", name: "Bakery" },
          ],
        }),
      } as unknown as Response)
      .mockResolvedValueOnce({
        ok: true,
        status: 201,
        json: vi.fn().mockResolvedValue({ savedCount: 1 }),
      } as unknown as Response)

    vi.stubGlobal("fetch", fetchMock)

    render(<ReviewPage />)

    await screen.findByDisplayValue("Milk")

    fireEvent.change(screen.getByLabelText(/edit name/i), {
      target: { value: "Updated Milk" },
    })

    fireEvent.change(screen.getByLabelText(/edit quantity/i), {
      target: { value: "3" },
    })

    fireEvent.change(screen.getByLabelText(/edit category/i), {
      target: { value: "cat-bakery" },
    })

    fireEvent.click(screen.getByRole("button", { name: /confirm items/i }))

    await waitFor(() => {
      expect(fetchMock).toHaveBeenCalledTimes(2)
    })

    const postCall = fetchMock.mock.calls[1]
    expect(postCall[0]).toBe("/api/receipts/receipt-123/review")

    const postBody = JSON.parse(postCall[1].body as string)

    expect(postBody.selectedItemIds).toEqual(["draft-1"])
    expect(postBody.editedItems).toEqual([
      {
        id: "draft-1",
        name: "Updated Milk",
        quantity: 3,
        categoryId: "cat-bakery",
      },
    ])
  })

  it("shows validation error when edited quantity is invalid", async () => {
    getSearchParamMock.mockReturnValue("receipt-123")

    const fetchMock = vi.fn().mockResolvedValue({
      ok: true,
      status: 200,
      json: vi.fn().mockResolvedValue({
        id: "receipt-123",
        ocrStatus: "SUCCESS",
        imagePath: "uploads/receipt.jpg",
        draftItems: [
          {
            id: "draft-1",
            name: "Milk",
            quantity: 2,
            categoryId: "cat-dairy",
            confidence: 0.9,
            isSelected: true,
          },
        ],
      }),
    } as unknown as Response)

    vi.stubGlobal("fetch", fetchMock)

    render(<ReviewPage />)

    await screen.findByText("Milk")

    fireEvent.change(screen.getByLabelText("Edit quantity for Milk"), {
      target: { value: "0" },
    })

    fireEvent.click(screen.getByRole("button", { name: /confirm items/i }))

    const errorAlert = await screen.findByTestId("save-error")
    expect(errorAlert).toHaveTextContent(/some selected items still need review/i)
    expect(fetchMock).toHaveBeenCalledTimes(1)
  })
})
