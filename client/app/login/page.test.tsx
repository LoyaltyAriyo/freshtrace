import { act, fireEvent, render, screen, waitFor } from "@testing-library/react"
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest"
import LoginPage from "./page"

const { navigateAfterLogin } = vi.hoisted(() => ({ navigateAfterLogin: vi.fn() }))
vi.mock("@/lib/auth/navigate-after-login", () => ({ navigateAfterLogin }))
beforeEach(() => navigateAfterLogin.mockReset())
afterEach(() => vi.unstubAllGlobals())

describe("login role navigation", () => {
  it("provides the approved FreshTrace home link without duplicating its accessible name", () => {
    render(<LoginPage />)
    const home = screen.getByRole("link", { name: "FreshTrace home" })
    expect(home).toHaveAttribute("href", "/")
    expect(home.querySelector("img")).toHaveAttribute("src", "/brand/freshtrace-logo-mark-monochrome.svg")
    expect(home.querySelector("img")).toHaveAttribute("alt", "")
  })
  it.each(["ADMIN", "USER", null])(
    "navigates after a successful %s login using only safe user JSON", async (role) => {
      const fetchMock = vi.fn().mockResolvedValue(Response.json({
        user: { id: "fake-id", email: "test@example.com", role },
      }))
      vi.stubGlobal("fetch", fetchMock)
      render(<LoginPage />)
      fireEvent.change(screen.getByLabelText("Email"), { target: { value: "test@example.com" } })
      fireEvent.change(screen.getByLabelText("Password"), { target: { value: "fake-password" } })
      fireEvent.click(screen.getByRole("button", { name: "Sign In" }))
      await waitFor(() => expect(navigateAfterLogin).toHaveBeenCalledExactlyOnceWith(role))
      expect(fetchMock).toHaveBeenCalledTimes(1)
    },
  )
  it("waits for login to finish before navigation", async () => {
    let resolve!: (value: Response) => void
    vi.stubGlobal("fetch", vi.fn().mockReturnValue(new Promise<Response>((done) => { resolve = done })))
    render(<LoginPage />)
    fireEvent.change(screen.getByLabelText("Email"), { target: { value: "test@example.com" } })
    fireEvent.change(screen.getByLabelText("Password"), { target: { value: "fake-password" } })
    fireEvent.click(screen.getByRole("button", { name: "Sign In" }))
    expect(screen.getByRole("button", { name: "Signing in..." })).toBeDisabled()
    expect(navigateAfterLogin).not.toHaveBeenCalled()
    await act(async () => resolve(Response.json({ user: { role: "USER" } })))
    expect(navigateAfterLogin).toHaveBeenCalledExactlyOnceWith("USER")
  })
  it("shows failed login feedback without navigating", async () => {
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue(Response.json({ error: "Invalid email or password." }, { status: 401 })))
    render(<LoginPage />)
    fireEvent.change(screen.getByLabelText("Email"), { target: { value: "test@example.com" } })
    fireEvent.change(screen.getByLabelText("Password"), { target: { value: "wrong-password" } })
    fireEvent.click(screen.getByRole("button", { name: "Sign In" }))
    expect(await screen.findByRole("alert")).toHaveTextContent("Invalid email or password.")
    expect(navigateAfterLogin).not.toHaveBeenCalled()
  })
})
