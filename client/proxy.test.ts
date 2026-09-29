// @vitest-environment node
import { describe, expect, it, vi } from "vitest"
import { NextRequest } from "next/server"
import { unstable_doesMiddlewareMatch } from "next/experimental/testing/server"
import { config, proxy } from "./proxy"
import type { CookieMethodsServer } from "@supabase/ssr"

const { getUser } = vi.hoisted(() => ({ getUser: vi.fn() }))
vi.mock("@supabase/ssr", () => ({
  createServerClient: (_url: string, _key: string, { cookies }: { cookies: CookieMethodsServer }) => ({ auth: { getUser: () => getUser(cookies) } }),
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
    const anonymous = await proxy(request)
    expect(anonymous.status).toBe(307)
    expect(new URL(anonymous.headers.get("location")!).pathname).toBe("/login")
    getUser.mockResolvedValueOnce({ data: { user: { id: "synthetic-user" } } })
    const authenticated = await proxy(request)
    expect(authenticated.headers.get("x-middleware-next")).toBe("1")
    expect(authenticated.headers.has("location")).toBe(false)
  })
})

describe("session refresh", () => {
  it.each(["/account", "/api/items", "/api/analytics", "/api/receipts"])("forwards renewed cookies to %s and the browser", async (path) => {
    expect(unstable_doesMiddlewareMatch({ config, url: path })).toBe(true)
    getUser.mockImplementationOnce(async (cookies: CookieMethodsServer) => {
      await cookies.setAll!([{ name: "sb-session", value: "fresh", options: { path: "/", httpOnly: true } }], { "Pragma": "no-cache", "Expires": "0" })
      return { data: { user: { id: "user-1" } } }
    })
    const request = new NextRequest(`https://example.test${path}`, { headers: { cookie: "sb-session=expired" } })
    const response = await proxy(request)
    expect(request.cookies.get("sb-session")?.value).toBe("fresh")
    expect(response.headers.get("x-middleware-request-cookie")).toContain("sb-session=fresh")
    expect(response.cookies.get("sb-session")?.value).toBe("fresh")
    expect(response.headers.get("cache-control")).toContain("no-store")
    expect(response.headers.get("pragma")).toBe("no-cache")
    expect(response.headers.get("expires")).toBe("0")
  })

  it.each([true, false])("preserves session updates across redirects (authenticated=%s)", async (authenticated) => {
    getUser.mockImplementationOnce(async (cookies: CookieMethodsServer) => {
      await cookies.setAll!([{ name: "sb-session", value: authenticated ? "fresh" : "", options: { path: "/", maxAge: authenticated ? 3600 : 0 } }], { "Pragma": "no-cache" })
      return { data: { user: authenticated ? { id: "user-1" } : null } }
    })
    const response = await proxy(new NextRequest(`https://example.test${authenticated ? "/login" : "/account"}`))
    expect(response.status).toBe(307)
    expect(response.cookies.get("sb-session")?.value).toBe(authenticated ? "fresh" : "")
    expect(response.headers.get("cache-control")).toContain("no-store")
    expect(response.headers.get("pragma")).toBe("no-cache")
  })

  it("lets unauthenticated API calls reach their JSON authorization checks", async () => {
    getUser.mockResolvedValueOnce({ data: { user: null } })
    const response = await proxy(new NextRequest("https://example.test/api/items"))
    expect(response.headers.get("x-middleware-next")).toBe("1")
    expect(response.headers.has("location")).toBe(false)
  })

  it.each(["/api/auth/login", "/api/auth/signup", "/api/auth/logout", "/api/cron/keepalive"])("leaves %s to its own auth flow", (url) => {
    expect(unstable_doesMiddlewareMatch({ config, url })).toBe(false)
  })
})
