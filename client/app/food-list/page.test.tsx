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
  })

  it("shows a success message after redirect from receipt review", () => {
    getSearchParamMock.mockImplementation((key: string) => {
      if (key === "saved") return "1"
      if (key === "count") return "2"
      return null
    })

    render(<FoodListPage />)

    const banner = screen.getByTestId("save-success")
    expect(banner).toHaveTextContent("Items saved")
    expect(banner).toHaveTextContent("2 items saved to your food list successfully.")
  })

  it("does not show success message when no success query params are present", () => {
    getSearchParamMock.mockReturnValue(null)

    render(<FoodListPage />)

    expect(screen.queryByTestId("save-success")).not.toBeInTheDocument()
  })
})
