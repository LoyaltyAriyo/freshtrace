import { describe, it, expect, vi, afterEach } from "vitest"
import { render, screen, waitFor } from "@testing-library/react"
import HomePage from "@/app/page"

// Mock child components
vi.mock("@/components/priority-section", () => ({
  PrioritySection: ({ items }: any) => (
    <div data-testid="priority-section">{items.length}</div>
  ),
}))

vi.mock("@/components/recent-alerts", () => ({
  RecentAlerts: () => <div data-testid="recent-alerts">Alerts</div>,
}))

// Mock fetch
global.fetch = vi.fn()

describe("HomePage - Overview Data & UI", () => {
  afterEach(() => {
    vi.clearAllMocks()
  })

  const mockData = {
    items: [
      { id: "1", name: "Milk" },
      { id: "2", name: "Eggs" },
    ],
    useFirst: [{ id: "1", name: "Milk" }],
    useSoon: [{ id: "2", name: "Eggs" }],
    useLater: [],
  }

  // ✅ TEST: Loading state
  it("should show loading state initially", () => {
    ;(fetch as any).mockReturnValue(new Promise(() => {})) // never resolves

    render(<HomePage />)

    expect(screen.getByText(/loading priority overview/i)).toBeInTheDocument()
  })

  // ✅ TEST: Data accuracy in UI
  it("should render correct counts from API", async () => {
    ;(fetch as any).mockResolvedValue({
      ok: true,
      json: async () => mockData,
    })

    render(<HomePage />)

    await waitFor(() => {
      expect(screen.getByText(/2 active items/i)).toBeInTheDocument()

      expect(screen.getByText("Total Items")).toBeInTheDocument()
      expect(screen.getByText("2")).toBeInTheDocument()

      expect(screen.getByText("Use First")).toBeInTheDocument()
      expect(screen.getByText("1")).toBeInTheDocument()

      expect(screen.getByText("Use Soon")).toBeInTheDocument()
      expect(screen.getByText("1")).toBeInTheDocument()

      expect(screen.getByText("Use Later")).toBeInTheDocument()
      expect(screen.getByText("0")).toBeInTheDocument()
    })
  })

  // ✅ TEST: Priority sections data
  it("should pass correct data to priority sections", async () => {
    ;(fetch as any).mockResolvedValue({
      ok: true,
      json: async () => mockData,
    })

    render(<HomePage />)

    const sections = await screen.findAllByTestId("priority-section")

    expect(sections[0]).toHaveTextContent("1")
    expect(sections[1]).toHaveTextContent("1")
    expect(sections[2]).toHaveTextContent("0")
  })

  // ✅ TEST: Error handling
  it("should display error message on API failure", async () => {
    ;(fetch as any).mockResolvedValue({
      ok: false,
      json: async () => ({ error: "API failed" }),
    })

    render(<HomePage />)

    await waitFor(() => {
      expect(screen.getByText(/unable to load priorities/i)).toBeInTheDocument()
      expect(screen.getByText(/API failed/i)).toBeInTheDocument()
    })
  })
})