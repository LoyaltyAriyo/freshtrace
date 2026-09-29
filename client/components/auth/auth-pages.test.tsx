import { fireEvent, render, screen } from "@testing-library/react"
import { afterEach, describe, expect, it, vi } from "vitest"
import LoginPage from "@/app/login/page"
import SignupPage from "@/app/signup/page"

vi.mock("next/navigation", () => ({ useRouter: () => ({ push: vi.fn() }) }))
afterEach(() => vi.unstubAllGlobals())

describe.each([["login", LoginPage], ["signup", SignupPage]] as const)("%s auth controls", (_, Page) => {
  it("announces each social provider as coming soon without making a request or submitting the form", () => {
    const fetchMock = vi.fn()
    vi.stubGlobal("fetch", fetchMock)
    render(<Page />)
    for (const provider of ["Google", "Apple"]) {
      const button = screen.getByRole("button", { name: `Sign in with ${provider}` })
      expect(button).toHaveAttribute("type", "button")
      fireEvent.click(button)
      expect(screen.getByRole("status")).toHaveTextContent(`${provider} sign-in: Coming soon.`)
      expect(screen.queryByRole("alert")).not.toBeInTheDocument()
    }
    expect(fetchMock).not.toHaveBeenCalled()
  })

  it("toggles password visibility without losing the entered value", () => {
    render(<Page />)
    const password = screen.getByLabelText("Password", { exact: true })
    fireEvent.change(password, { target: { value: "example-password" } })
    fireEvent.click(screen.getByRole("button", { name: "Show password" }))
    expect(password).toHaveAttribute("type", "text")
    expect(password).toHaveValue("example-password")
    fireEvent.click(screen.getByRole("button", { name: "Hide password" }))
    expect(password).toHaveAttribute("type", "password")
    expect(password).toHaveValue("example-password")
  })
})
