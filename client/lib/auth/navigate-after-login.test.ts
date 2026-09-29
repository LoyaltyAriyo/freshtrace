// @vitest-environment node
import { afterEach, describe, expect, it, vi } from "vitest"
import { navigateAfterLogin } from "./navigate-after-login"

afterEach(() => vi.unstubAllGlobals())

describe("fresh document navigation after login", () => {
  it.each([
    ["ADMIN", "/admin"],
    ["USER", "/"],
    [null, "/"],
    [undefined, "/"],
    ["https://untrusted.example", "/"],
  ])("loads a fresh %s destination without using the router cache", (role, destination) => {
    const replace = vi.fn()
    vi.stubGlobal("window", { location: { replace } })
    navigateAfterLogin(role)
    expect(replace).toHaveBeenCalledExactlyOnceWith(destination)
  })
})
