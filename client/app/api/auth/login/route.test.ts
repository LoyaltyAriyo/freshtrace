// @vitest-environment node
import { createServerClient } from "@supabase/ssr"
import { parse as parseCookie } from "cookie"
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest"
import { POST } from "./route"

const { findUnique } = vi.hoisted(() => ({ findUnique: vi.fn() }))
vi.mock("@/lib/prisma", () => ({ prisma: { user: { findUnique } } }))
const fetchMock = vi.fn()
const url = "https://fake-auth.example.invalid"
const key = "sb_publishable_FAKE_AUTH_TEST"
const authId = "11111111-2222-4333-8444-555555555555"
const user = { id: authId, email: "test@example.com", aud: "authenticated", role: "authenticated",
  app_metadata: {}, user_metadata: { private_detail: "FAKE_METADATA".repeat(500) }, created_at: "2026-01-01T00:00:00Z" }
function session() {
  const encoded = (value: unknown) => Buffer.from(JSON.stringify(value)).toString("base64url")
  const access_token = [encoded({ alg: "HS256" }),
    encoded({ sub: authId, exp: Math.floor(Date.now() / 1000) + 3600 }), "fake-signature"].join(".")
  return { access_token, refresh_token: "FAKE_REFRESH_TOKEN", token_type: "bearer", expires_in: 3600, user }
}
function request(body: unknown = { email: user.email, password: "fake-password" }) {
  return new Request("http://localhost/api/auth/login", {
    method: "POST", body: JSON.stringify(body), headers: { cookie: "unrelated=preserved" },
  })
}
beforeEach(() => {
  fetchMock.mockReset()
  findUnique.mockReset().mockResolvedValue({ role: "USER" })
  vi.stubEnv("NODE_ENV", "production")
  vi.stubEnv("NEXT_PUBLIC_SUPABASE_URL", url)
  vi.stubEnv("NEXT_PUBLIC_SUPABASE_ANON_KEY", key)
  // The actual SDK runs, but every HTTP request is intercepted: no live Auth.
  vi.stubGlobal("fetch", fetchMock)
  fetchMock.mockImplementation(async (target: string) => {
    if (target === url + "/auth/v1/token?grant_type=password") return Response.json(session())
    if (target === url + "/auth/v1/user") return Response.json(user)
    throw new Error("Unexpected test request forbidden")
  })
})
afterEach(() => { vi.unstubAllEnvs(); vi.unstubAllGlobals() })

describe("login session cookies and minimal response", () => {
  it("sets Secure chunked session cookies that the installed SDK can read on the next request", async () => {
    const issuedSession = session()
    fetchMock.mockResolvedValueOnce(Response.json(issuedSession))
    const response = await POST(request())
    expect(response.status).toBe(200)
    expect(await response.json()).toEqual({ user: { id: authId, email: user.email, role: "USER" } })
    expect(response.headers.get("cache-control")).toBe("private, no-store")
    expect(findUnique).toHaveBeenCalledExactlyOnceWith({ where: { id: authId }, select: { role: true } })
    const headers = response.headers.getSetCookie()
    expect(headers.length).toBeGreaterThan(1)
    for (const header of headers) {
      expect(header).toContain("Secure")
      expect(header).toContain("SameSite=Lax")
      expect(header).toContain("Path=/")
      expect(header).not.toContain("unrelated=")
    }
    const cookies = headers.flatMap((header) => Object.entries(parseCookie(header.split(";")[0]))
      .map(([name, value]) => ({ name, value: value! })))
    const nextRequestClient = createServerClient(url, key, { cookies: { getAll: () => cookies, setAll: () => {} } })
    const { data, error } = await nextRequestClient.auth.getUser()
    expect(error).toBeNull()
    expect(data.user?.id).toBe(authId)
    expect(fetchMock).toHaveBeenCalledTimes(2)
    const userRequest = fetchMock.mock.calls[1][1] as RequestInit
    expect(new Headers(userRequest.headers).get("authorization")).toBe("Bearer " + issuedSession.access_token)
  })
  it.each(["ADMIN", "USER", null])("preserves the safe %s role and exposes no session or metadata", async (role) => {
    findUnique.mockResolvedValue({ role })
    const response = await POST(request())
    expect(await response.json()).toEqual({ user: { id: authId, email: user.email, role } })
  })
  it("preserves login with a null role if the profile query fails", async () => {
    findUnique.mockRejectedValue(new Error("FAKE_PRIVATE_DATABASE_ERROR"))
    const response = await POST(request())
    expect(response.status).toBe(200)
    expect(await response.json()).toEqual({ user: { id: authId, email: user.email, role: null } })
    expect(response.headers.has("set-cookie")).toBe(true)
  })
  it.each([
    ["invalid_credentials", 400, 401], ["email_not_confirmed", 400, 403],
    ["user_banned", 400, 403], ["over_request_rate_limit", 429, 429], ["unknown", 400, 400],
  ])("maps %s safely to %i/%i with no session cookies", async (code, status, expected) => {
    fetchMock.mockResolvedValue(Response.json({ code, msg: "FAKE_SECRET_PROVIDER_DETAIL" },
      { status, headers: { "X-Supabase-Api-Version": "2024-01-01" } }))
    const response = await POST(request())
    expect(response.status).toBe(expected)
    expect(await response.text()).not.toContain("FAKE_SECRET")
    expect(response.headers.has("set-cookie")).toBe(false)
    expect(findUnique).not.toHaveBeenCalled()
  })
  it.each([null, [], true, {}, { email: {}, password: [] }])("rejects invalid input %# before Auth", async (body) => {
    expect((await POST(request(body))).status).toBe(400)
    expect(fetchMock).not.toHaveBeenCalled()
  })
  it("sanitizes unexpected client initialization failures", async () => {
    vi.stubEnv("NEXT_PUBLIC_SUPABASE_URL", "")
    const response = await POST(request())
    expect(response.status).toBe(500)
    expect(await response.json()).toEqual({ error: "Login failed. Please try again." })
    expect(response.headers.has("set-cookie")).toBe(false)
  })
})
