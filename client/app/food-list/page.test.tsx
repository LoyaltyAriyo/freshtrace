/* @vitest-environment jsdom */

import { beforeEach, describe, expect, it, vi } from "vitest"
import { render, screen } from "@testing-library/react"

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
})
