/* @vitest-environment jsdom */

import { beforeEach, describe, expect, it, vi } from "vitest"
import { render, screen } from "@testing-library/react"

import HomePage from "./page"

describe("HomePage priority overview", () => {
  beforeEach(() => {
    vi.restoreAllMocks()
  })

  it("loads prioritized items from backend", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue({
        ok: true,
        json: vi.fn().mockResolvedValue({
          items: [
            {
              id: "item-1",
              name: "Milk",
              category: "dairy",
              quantity: "2",
              addedDate: "2026-03-22T00:00:00.000Z",
              priority: "use-soon",
              status: "active",
            },
          ],
          useFirst: [],
          useSoon: [
            {
              id: "item-1",
              name: "Milk",
              category: "dairy",
              quantity: "2",
              addedDate: "2026-03-22T00:00:00.000Z",
              priority: "use-soon",
              status: "active",
            },
          ],
          useLater: [],
        }),
      })
    )

    render(<HomePage />)

    expect(await screen.findByText("Milk")).toBeInTheDocument()
    expect(screen.getByText("1 active items in your kitchen")).toBeInTheDocument()
  })

  it("shows error state when prioritized endpoint fails", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue({
        ok: false,
        json: vi.fn().mockResolvedValue({ error: "Backend failure" }),
      })
    )

    render(<HomePage />)

    const alert = await screen.findByTestId("priority-load-error")
    expect(alert).toHaveTextContent(/backend failure/i)
  })
})
