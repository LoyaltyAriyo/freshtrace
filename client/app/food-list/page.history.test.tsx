/* @vitest-environment jsdom */
import { act, fireEvent, render, screen, waitFor, within } from "@testing-library/react"
import { beforeEach, describe, expect, it, vi } from "vitest"
import FoodListPage from "./page"
import type { HistoryStatus, ItemHistoryEntry } from "@/lib/item-history"

vi.mock("next/navigation", () => ({ useSearchParams: () => new URLSearchParams() }))

function entry(status: HistoryStatus, id = "history-1"): ItemHistoryEntry {
  const common = { id, foodItemId: `food-${id}`, name: `${status} apples ${id}`,
    categoryId: "produce", categoryName: "Produce", quantity: 2,
    dateAdded: "2026-04-01T12:00:00.000Z" }
  return status === "USED"
    ? { ...common, status, usedAt: "2026-04-10T15:30:00.000Z", wastedAt: null }
    : { ...common, status, usedAt: null, wastedAt: "2026-04-11T17:45:00.000Z" }
}
function page(items: ItemHistoryEntry[] = [], nextCursor: string | null = null) {
  return { items, pagination: { limit: 20, nextCursor, hasMore: nextCursor !== null } }
}
function response(data: unknown, ok = true) {
  return { ok, json: async () => data } as Response
}
function deferred() {
  let resolve!: (response: Response) => void
  const promise = new Promise<Response>((r) => { resolve = r })
  return { promise, resolve }
}
function select(name: string) {
  fireEvent.mouseDown(screen.getByRole("tab", { name }), { button: 0, ctrlKey: false })
}
const fetchMock = vi.fn()
beforeEach(() => {
  fetchMock.mockReset()
  fetchMock.mockImplementation(async (url: string) =>
    response(url.startsWith("/api/items/history") ? page() : []))
  vi.stubGlobal("fetch", fetchMock)
})

describe("Food List history views", () => {
  it("selects Active initially and does not prefetch unused history", async () => {
    render(<FoodListPage />)
    expect(screen.getByRole("tab", { name: "Active" })).toHaveAttribute("aria-selected", "true")
    await screen.findByText("No items found")
    expect(fetchMock).toHaveBeenCalledTimes(1)
    expect(fetchMock.mock.calls[0][0]).toBe("/api/items")
  })

  it.each(["USED", "WASTED"] as const)("loads only %s and renders read-only snapshots and timestamps", async (status) => {
    const item = entry(status)
    fetchMock.mockImplementation(async (url: string) => response(url.includes("history") ? page([item]) : []))
    render(<FoodListPage />)
    const label = status === "USED" ? "Used" : "Wasted"
    select(label)
    const panel = screen.getByRole("tabpanel", { name: label })
    expect(await within(panel).findByText(item.name)).toBeVisible()
    expect(within(panel).getByText("Qty: 2")).toBeVisible()
    expect(within(panel).getByText("Produce")).toBeVisible()
    expect(within(panel).queryByRole("button", { name: /edit|mark|used|wasted/i })).not.toBeInTheDocument()
    const eventAt = item.usedAt ?? item.wastedAt
    const timestamp = within(panel).getByText(new Date(eventAt).toLocaleString())
    expect(timestamp).toHaveAttribute("datetime", eventAt)
    expect(timestamp.parentElement).toHaveTextContent(`${label} on:`)
    expect(within(panel).getByText(new Date(item.dateAdded!).toLocaleDateString())).toHaveAttribute("datetime", item.dateAdded)
    expect(fetchMock.mock.calls.filter(([url]) => url.includes("history")).map(([url]) => url))
      .toEqual([`/api/items/history?status=${status}`])
    expect(screen.getByRole("tab", { name: label })).toHaveAttribute("aria-selected", "true")
  })

  it.each(["Used", "Wasted"])("shows the distinct empty %s state", async (label) => {
    render(<FoodListPage />)
    select(label)
    expect(await screen.findByText(`No ${label.toLowerCase()} items yet. Items you mark as ${label.toLowerCase()} will appear here.`)).toBeVisible()
  })

  it("shows loading, a safe error, and a successful retry", async () => {
    const pending = deferred()
    let attempts = 0
    fetchMock.mockImplementation((url: string) => {
      if (!url.includes("history")) return Promise.resolve(response([]))
      return ++attempts === 1 ? pending.promise : Promise.resolve(response(page([entry("USED")])))
    })
    render(<FoodListPage />)
    select("Used")
    expect(screen.getByRole("status")).toHaveTextContent("Loading used history")
    await act(async () => pending.resolve(response({ error: "private server detail" }, false)))
    expect(screen.getByRole("alert")).toHaveTextContent("Unable to load used history")
    expect(screen.queryByText("private server detail")).not.toBeInTheDocument()
    fireEvent.click(screen.getByRole("button", { name: "Retry" }))
    expect(await screen.findByText(entry("USED").name)).toBeVisible()
    expect(attempts).toBe(2)
  })

  it("aborts an obsolete tab request and ignores its late response", async () => {
    const old = deferred()
    fetchMock.mockImplementation((url: string) => {
      if (url.includes("status=USED")) return old.promise
      return Promise.resolve(response(url.includes("history") ? page([entry("WASTED")]) : []))
    })
    render(<FoodListPage />)
    select("Used")
    const oldSignal = fetchMock.mock.calls.find(([url]) => url.includes("status=USED"))![1].signal as AbortSignal
    select("Wasted")
    expect(oldSignal.aborted).toBe(true)
    expect(await screen.findByText(entry("WASTED").name)).toBeVisible()
    await act(async () => old.resolve(response(page([entry("USED")]))))
    expect(screen.queryByText(entry("USED").name)).not.toBeInTheDocument()
    expect(screen.getByText(entry("WASTED").name)).toBeVisible()
  })

  it("cancels requests on unmount even when fetch ignores cancellation", async () => {
    const pending = deferred()
    fetchMock.mockImplementation((url: string) => url.includes("history") ? pending.promise : Promise.resolve(response([])))
    const { unmount } = render(<FoodListPage />)
    select("Used")
    const signal = fetchMock.mock.calls.find(([url]) => url.includes("history"))![1].signal as AbortSignal
    unmount()
    expect(signal.aborted).toBe(true)
    await act(async () => pending.resolve(response(page([entry("USED")]))))
    expect(screen.queryByText(entry("USED").name)).not.toBeInTheDocument()
  })

  it("loads subsequent pages once and deduplicates overlapping cards", async () => {
    const more = deferred()
    fetchMock.mockImplementation((url: string) => {
      if (url.includes("cursor=")) return more.promise
      return Promise.resolve(response(url.includes("history") ? page([entry("USED")], "next-page") : []))
    })
    render(<FoodListPage />)
    select("Used")
    await screen.findByText(entry("USED").name)
    const button = screen.getByRole("button", { name: "Load more used items" })
    fireEvent.click(button)
    fireEvent.click(button)
    expect(fetchMock.mock.calls.filter(([url]) => url.includes("cursor=")).length).toBe(1)
    await act(async () => more.resolve(response(page([entry("USED"), entry("USED", "history-2")]))))
    expect(screen.getAllByText(entry("USED").name)).toHaveLength(1)
    expect(screen.getByText(entry("USED", "history-2").name)).toBeVisible()
    expect(screen.queryByRole("button", { name: "Load more used items" })).not.toBeInTheDocument()
  })

  it.each(["USED", "WASTED"] as const)("refreshes Active and %s history after marking, without duplicate requests", async (status) => {
    let marked = false
    fetchMock.mockImplementation(async (url: string, options?: RequestInit) => {
      if (options?.method === "POST") { marked = true; return response({ changed: true }) }
      if (url.includes("history")) return response(page(marked ? [entry(status)] : []))
      return response(marked ? [] : [{ id: "food-1", name: "Active apples", quantity: 2,
        categoryId: "produce", categoryName: "Produce", dateAdded: "2026-04-01T12:00:00.000Z", priority: "use-soon" }])
    })
    render(<FoodListPage />)
    await screen.findByText("Active apples")
    const label = status === "USED" ? "Used" : "Wasted"
    select(label)
    await screen.findByText(`No ${label.toLowerCase()} items yet. Items you mark as ${label.toLowerCase()} will appear here.`)
    select("Active")
    fireEvent.click(screen.getByRole("button", { name: label }))
    await screen.findByText("No items found")
    select(label)
    expect(await screen.findByText(entry(status).name)).toBeVisible()
    expect(fetchMock.mock.calls.filter(([url]) => url === "/api/items")).toHaveLength(2)
    expect(fetchMock.mock.calls.filter(([, options]) => options?.method === "POST")).toHaveLength(1)
    expect(fetchMock.mock.calls.filter(([url]) => url.includes("history"))).toHaveLength(2)
  })

  it("supports arrow-key navigation and selected-state semantics", async () => {
    render(<FoodListPage />)
    const active = screen.getByRole("tab", { name: "Active" })
    act(() => active.focus())
    fireEvent.keyDown(active, { key: "ArrowRight" })
    await waitFor(() => expect(screen.getByRole("tab", { name: "Used" })).toHaveFocus())
    expect(screen.getByRole("tab", { name: "Used" })).toHaveAttribute("aria-selected", "true")
    expect(screen.getByRole("tabpanel", { name: "Used" })).toBeVisible()
  })

  it.each(["USED", "WASTED"] as const)("refreshes %s even when its tab opens before the action completes", async (status) => {
    const mutation = deferred()
    let marked = false
    fetchMock.mockImplementation((url: string, options?: RequestInit) => {
      if (options?.method === "POST") return mutation.promise
      if (url.includes("history")) return Promise.resolve(response(page(marked ? [entry(status)] : [])))
      return Promise.resolve(response(marked ? [] : [{ id: "food-1", name: "Active apples", quantity: 2,
        categoryId: "produce", categoryName: "Produce", dateAdded: "2026-04-01T12:00:00.000Z", priority: "use-soon" }]))
    })
    render(<FoodListPage />)
    await screen.findByText("Active apples")
    const label = status === "USED" ? "Used" : "Wasted"
    fireEvent.click(screen.getByRole("button", { name: label }))
    select(label)
    await screen.findByText(`No ${label.toLowerCase()} items yet. Items you mark as ${label.toLowerCase()} will appear here.`)
    marked = true
    await act(async () => mutation.resolve(response({ changed: true })))
    expect(await screen.findByText(entry(status).name)).toBeVisible()
    expect(fetchMock.mock.calls.filter(([url]) => url === "/api/items")).toHaveLength(2)
    expect(fetchMock.mock.calls.filter(([url]) => url.includes("history"))).toHaveLength(2)
  })

  it("retries the failed next page without discarding previously loaded history", async () => {
    let attempts = 0
    fetchMock.mockImplementation(async (url: string) => {
      if (!url.includes("history")) return response([])
      if (!url.includes("cursor=")) return response(page([entry("USED")], "next-page"))
      return ++attempts === 1 ? response({}, false) : response(page([entry("USED", "history-2")]))
    })
    render(<FoodListPage />)
    select("Used")
    await screen.findByText(entry("USED").name)
    fireEvent.click(screen.getByRole("button", { name: "Load more used items" }))
    await screen.findByRole("alert")
    expect(screen.getByText(entry("USED").name)).toBeVisible()
    fireEvent.click(screen.getByRole("button", { name: "Retry" }))
    expect(await screen.findByText(entry("USED", "history-2").name)).toBeVisible()
    expect(screen.getAllByRole("listitem")).toHaveLength(2)
    expect(fetchMock.mock.calls.filter(([url]) => url.includes("cursor=")).map(([url]) => url))
      .toEqual(Array(2).fill("/api/items/history?status=USED&cursor=next-page"))
  })
})
