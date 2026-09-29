import { render, screen, within } from "@testing-library/react"
import { beforeEach, describe, expect, it, vi } from "vitest"
import { AppNav } from "./app-nav"
import { ConditionalNav } from "./conditional-nav"

const { route } = vi.hoisted(() => ({ route: { pathname: "/" } }))
vi.mock("next/navigation", () => ({
  usePathname: () => route.pathname,
  useRouter: () => ({ push: vi.fn(), refresh: vi.fn() }),
}))

beforeEach(() => { route.pathname = "/" })

describe("FreshTrace navigation", () => {
  it("uses one accessible home link with a compact mark and wordmark", () => {
    render(<AppNav />)
    const link = screen.getByRole("link", { name: "FreshTrace home" })
    expect(link).toHaveAttribute("href", "/")
    expect(link).toHaveClass("min-h-11", "shrink-0")
    const image = link.querySelector("img")!
    expect(image).toHaveAttribute("src", "/brand/freshtrace-logo-mark-monochrome.svg")
    expect(image).toHaveAttribute("alt", "")
    expect(image.width).toBe(28)
    expect(image.height).toBe(28)
    expect(image).toHaveAttribute("loading", "eager")
    expect(image).not.toHaveAttribute("srcset")
    expect(link.querySelectorAll("img")).toHaveLength(1)
    expect(link.textContent).toBe("FreshTrace")
  })

  it("keeps the full logo on mobile and uses bottom navigation through tablet widths", () => {
    render(<AppNav />)
    const [desktop, compact] = screen.getAllByRole("navigation", { name: "Main navigation" })
    expect(desktop).toHaveClass("hidden", "lg:flex")
    expect(compact).toHaveClass("lg:hidden")
    const logo = screen.getByRole("link", { name: "FreshTrace home" })
    expect(logo).not.toHaveClass("hidden")
    for (const nav of [desktop, compact]) {
      for (const [name, href] of [["Home", "/"], ["Scan", "/scan"], ["Food List", "/food-list"], ["Manual Entry", "/manual-entry"], ["Account", "/account"]]) {
        expect(within(nav).getByRole("link", { name })).toHaveAttribute("href", href)
      }
      expect(within(nav).getByRole("link", { name: "Home" })).toHaveAttribute("aria-current", "page")
    }
  })

  it("preserves admin destinations, sign out, and nested active states", () => {
    route.pathname = "/admin/users/example"
    render(<AppNav variant="admin" />)
    expect(screen.getByRole("link", { name: "FreshTrace admin home" })).toHaveAttribute("href", "/admin")
    for (const nav of screen.getAllByRole("navigation")) {
      for (const [name, href] of [["Overview", "/admin"], ["Analytics", "/admin/analytics"], ["Users", "/admin/users"], ["Error Logs", "/admin/errors"]]) {
        expect(within(nav).getByRole("link", { name })).toHaveAttribute("href", href)
      }
      expect(within(nav).getByRole("link", { name: "Users" })).toHaveAttribute("aria-current", "page")
      expect(within(nav).getByRole("link", { name: "Overview" })).not.toHaveAttribute("aria-current")
      expect(within(nav).queryByRole("link", { name: "Food List" })).not.toBeInTheDocument()
    }
    expect(screen.getByRole("button", { name: /sign out/i })).toBeInTheDocument()
  })

  it.each(["/login", "/signup", "/admin", "/admin/analytics"])("avoids duplicate shared headers on %s", (pathname) => {
    route.pathname = pathname
    const { container } = render(<ConditionalNav />)
    expect(container).toBeEmptyDOMElement()
  })

  it.each(["/", "/food-list", "/scan", "/account", "/missing-page"])("preserves the shared header on %s", (pathname) => {
    route.pathname = pathname
    render(<ConditionalNav />)
    expect(screen.getByRole("link", { name: "FreshTrace home" })).toBeInTheDocument()
  })
})
