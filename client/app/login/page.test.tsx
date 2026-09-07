import { fireEvent, render, screen, waitFor } from "@testing-library/react"
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest"
import LoginPage from "./page"

const { push } = vi.hoisted(() => ({ push: vi.fn() }))
vi.mock("next/navigation", () => ({ useRouter: () => ({ push }) }))
beforeEach(() => push.mockReset())
afterEach(() => vi.unstubAllGlobals())

describe("login role navigation", () => {
  it.each([["ADMIN", "/admin"], ["USER", "/"], [null, "/"]])(
    "routes %s to %s using only safe user JSON", async (role, destination) => {
      const fetchMock = vi.fn().mockResolvedValue(Response.json({
        user: { id: "fake-id", email: "test@example.com", role },
      }))
      vi.stubGlobal("fetch", fetchMock)
      render(<LoginPage />)
      fireEvent.change(screen.getByLabelText("Email"), { target: { value: "test@example.com" } })
      fireEvent.change(screen.getByLabelText("Password"), { target: { value: "fake-password" } })
      fireEvent.click(screen.getByRole("button", { name: "Sign In" }))
      await waitFor(() => expect(push).toHaveBeenCalledExactlyOnceWith(destination))
      expect(fetchMock).toHaveBeenCalledTimes(1)
    },
  )
})
