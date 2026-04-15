/* @vitest-environment jsdom */

import { beforeEach, describe, expect, it, vi } from "vitest"
import { render, screen, within } from "@testing-library/react"

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

    const emptyStates = await screen.findAllByText("No items in this category")
    expect(emptyStates).toHaveLength(2)
  })

  it("renders items under the correct priority sections", async () => {
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
              quantity: "1",
              addedDate: "2026-03-20T00:00:00.000Z",
              priority: "use-first",
              status: "active",
            },
            {
              id: "item-2",
              name: "Apples",
              category: "produce",
              quantity: "3",
              addedDate: "2026-03-21T00:00:00.000Z",
              priority: "use-soon",
              status: "active",
            },
            {
              id: "item-3",
              name: "Rice",
              category: "pantry",
              quantity: "1 bag",
              addedDate: "2026-03-10T00:00:00.000Z",
              priority: "use-later",
              status: "active",
            },
          ],
          useFirst: [
            {
              id: "item-1",
              name: "Milk",
              category: "dairy",
              quantity: "1",
              addedDate: "2026-03-20T00:00:00.000Z",
              priority: "use-first",
              status: "active",
            },
          ],
          useSoon: [
            {
              id: "item-2",
              name: "Apples",
              category: "produce",
              quantity: "3",
              addedDate: "2026-03-21T00:00:00.000Z",
              priority: "use-soon",
              status: "active",
            },
          ],
          useLater: [
            {
              id: "item-3",
              name: "Rice",
              category: "pantry",
              quantity: "1 bag",
              addedDate: "2026-03-10T00:00:00.000Z",
              priority: "use-later",
              status: "active",
            },
          ],
        }),
      }),
    )

    render(<HomePage />)

    const priorityOverview = await screen.findByRole("region", {
      name: "Priority overview",
    })

    const useFirstHeading = within(priorityOverview).getByText("Use First")
    const useSoonHeading = within(priorityOverview).getByText("Use Soon")
    const useLaterHeading = within(priorityOverview).getByText("Use Later")

    const useFirstCard = useFirstHeading.parentElement?.parentElement as HTMLElement
    const useSoonCard = useSoonHeading.parentElement?.parentElement as HTMLElement
    const useLaterCard = useLaterHeading.parentElement?.parentElement as HTMLElement

    expect(within(useFirstCard).getByText("Milk")).toBeInTheDocument()
    expect(within(useFirstCard).queryByText("Apples")).not.toBeInTheDocument()
    expect(within(useFirstCard).queryByText("Rice")).not.toBeInTheDocument()

    expect(within(useSoonCard).getByText("Apples")).toBeInTheDocument()
    expect(within(useSoonCard).queryByText("Milk")).not.toBeInTheDocument()
    expect(within(useSoonCard).queryByText("Rice")).not.toBeInTheDocument()

    expect(within(useLaterCard).getByText("Rice")).toBeInTheDocument()
    expect(within(useLaterCard).queryByText("Milk")).not.toBeInTheDocument()
    expect(within(useLaterCard).queryByText("Apples")).not.toBeInTheDocument()
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
