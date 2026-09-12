// @vitest-environment node
import { describe, expect, it, vi } from "vitest"
import { NextRequest } from "next/server"
import { unstable_doesMiddlewareMatch } from "next/experimental/testing/server"
import { config, middleware } from "./middleware"

const { getUser } = vi.hoisted(() => ({ getUser: vi.fn() }))
vi.mock("@supabase/ssr", () => ({
  createServerClient: () => ({ auth: { getUser } }),
}))

describe("public brand routes", () => {
  it.each(["/brand/freshtrace-logo-horizontal.svg", "/brand/icons/favicon.svg", "/brand/icons/favicon-32x32.png", "/brand/icons/favicon-16x16.png", "/brand/icons/apple-touch-icon.png", "/brand/icons/icon-192.png", "/brand/icons/icon-512.png", "/manifest.webmanifest"])("serves %s without authentication", (url) => {
    expect(unstable_doesMiddlewareMatch({ config, url })).toBe(false)
  })

  it.each(["/", "/food-list", "/scan", "/account", "/admin", "/missing-page", "/brandish", "/manifest.webmanifest-extra"])("keeps the auth boundary for %s", (url) => {
    expect(unstable_doesMiddlewareMatch({ config, url })).toBe(true)
  })

  it("preserves anonymous redirects and lets signed-in unknown pages reach Next's not-found handler", async () => {
    const request = new NextRequest("http://localhost/missing-page")
    getUser.mockResolvedValueOnce({ data: { user: null } })
    const anonymous = await middleware(request)
    expect(anonymous.status).toBe(307)
    expect(new URL(anonymous.headers.get("location")!).pathname).toBe("/login")
    getUser.mockResolvedValueOnce({ data: { user: { id: "synthetic-user" } } })
    const authenticated = await middleware(request)
    expect(authenticated.headers.get("x-middleware-next")).toBe("1")
    expect(authenticated.headers.has("location")).toBe(false)
  })
})
