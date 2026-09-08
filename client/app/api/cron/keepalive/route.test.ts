// @vitest-environment node
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest"
import { unstable_doesMiddlewareMatch } from "next/experimental/testing/server"
import { config as middlewareConfig } from "@/middleware"
import vercelConfig from "@/vercel.json"
import { GET, dynamic, runtime } from "./route"

const { queryRaw, otherDatabaseAccess, sessionAccess } = vi.hoisted(() => ({
  queryRaw: vi.fn(), otherDatabaseAccess: vi.fn(), sessionAccess: vi.fn(),
}))
vi.mock("server-only", () => ({}))
vi.mock("@supabase/ssr", () => ({ createServerClient: sessionAccess }))
vi.mock("@/lib/prisma", () => ({
  prisma: new Proxy({}, {
    get(_target, key) {
      if (key === "$queryRaw") return queryRaw
      otherDatabaseAccess(key)
      throw new Error("Unexpected database API")
    },
  }),
}))

// Deliberately public, synthetic fixtures, never usable production credentials.
const secret = "KEEPALIVE_TEST_ONLY_NOT_A_REAL_SECRET"
const databaseUrl = "postgresql://fake:fake@127.0.0.1:65535/offline"
const privateError = "SYNTHETIC_PRIVATE_DATABASE_ERROR"
const privateResult = "SYNTHETIC_PRIVATE_QUERY_RESULT"
function request(authorization: string | null = `Bearer ${secret}`, method = "GET") {
  return new Request("https://example.invalid/api/cron/keepalive", {
    method,
    headers: authorization === null ? {} : { authorization },
  })
}

beforeEach(() => {
  vi.clearAllMocks()
  queryRaw.mockReset().mockResolvedValue([{ result: privateResult }])
  vi.stubEnv("NODE_ENV", "production")
  vi.stubEnv("CRON_SECRET", secret)
  vi.stubEnv("DATABASE_URL", databaseUrl)
  vi.spyOn(console, "error").mockImplementation(() => {})
  vi.spyOn(console, "warn").mockImplementation(() => {})
  vi.spyOn(console, "log").mockImplementation(() => {})
})
afterEach(() => { vi.unstubAllEnvs(); vi.restoreAllMocks() })

async function expectResponse(response: Response, status: number) {
  expect(response.status).toBe(status)
  expect(response.headers.get("cache-control")).toBe("no-store")
  expect(response.headers.has("location")).toBe(false)
  expect(response.headers.has("set-cookie")).toBe(false)
  const body = await response.text()
  expect(JSON.parse(body)).toEqual({ ok: status === 200 })
  const output = JSON.stringify({ body, headers: [...response.headers],
    logs: vi.mocked(console.error).mock.calls, warnings: vi.mocked(console.warn).mock.calls,
    info: vi.mocked(console.log).mock.calls })
  for (const value of [secret, databaseUrl, privateError, privateResult, "Bearer", "127.0.0.1"]) {
    expect(output).not.toContain(value)
  }
  expect(otherDatabaseAccess).not.toHaveBeenCalled()
  expect(sessionAccess).not.toHaveBeenCalled()
}

describe("keepalive authorization and configuration", () => {
  it.each([undefined, "", "a".repeat(15)])("fails closed for missing/short configuration (%s)", async (value) => {
    vi.stubEnv("CRON_SECRET", value)
    await expectResponse(await GET(request()), 503)
    expect(queryRaw).not.toHaveBeenCalled()
    expect(console.error).not.toHaveBeenCalled()
  })

  it.each([null, "", `Basic ${secret}`, `bearer ${secret}`, `Bearer${secret}`,
    `Bearer  ${secret}`, "Bearer wrong", `Bearer ${secret}, Bearer ${secret}`,
    `Bearer ${"x".repeat(secret.length)}`, `Bearer ${secret}suffix`,
  ])("rejects missing, malformed or incorrect authorization %# before any database access", async (header) => {
    await expectResponse(await GET(request(header)), 401)
    expect(queryRaw).not.toHaveBeenCalled()
    expect(console.error).not.toHaveBeenCalled()
  })

  it("accepts the exact 16-character minimum", async () => {
    vi.stubEnv("CRON_SECRET", "a".repeat(16))
    await expectResponse(await GET(request(`Bearer ${"a".repeat(16)}`)), 200)
    expect(queryRaw).toHaveBeenCalledTimes(3)
  })

  it("does not accept secrets supplied in the URL or session cookies", async () => {
    const req = new Request(`https://example.invalid/api/cron/keepalive?secret=${secret}`, {
      headers: { cookie: "synthetic_session=present", "x-cron-secret": secret },
    })
    await expectResponse(await GET(req), 401)
    expect(queryRaw).not.toHaveBeenCalled()
  })

  it.each([undefined, "", "invalid", "https://example.invalid/database", "postgresql://localhost"])(
    "returns a generic server response for invalid database configuration %#", async (value) => {
      vi.stubEnv("DATABASE_URL", value)
      await expectResponse(await GET(request()), 503)
      expect(queryRaw).not.toHaveBeenCalled()
      expect(console.error).not.toHaveBeenCalled()
    })

  it("checks authorization before database configuration", async () => {
    vi.stubEnv("DATABASE_URL", undefined)
    await expectResponse(await GET(request(null)), 401)
    expect(queryRaw).not.toHaveBeenCalled()
  })

  it.each(["HEAD", "POST", "PUT", "PATCH", "DELETE", "OPTIONS"])(
    "never queries for %s, including Next automatic HEAD delegation", async (method) => {
      const response = await GET(request(`Bearer ${secret}`, method))
      await expectResponse(response, 405)
      expect(response.headers.get("allow")).toBe("GET")
      expect(queryRaw).not.toHaveBeenCalled()
    })
})

describe("keepalive read-only database activity", () => {
  it("runs exactly three sequential parameterless SELECT 1 tagged queries", async () => {
    let active = 0
    queryRaw.mockImplementation(async () => {
      active += 1
      expect(active).toBe(1)
      await Promise.resolve()
      active -= 1
      return [{ result: privateResult }]
    })
    await expectResponse(await GET(request()), 200)
    expect(queryRaw).toHaveBeenCalledTimes(3)
    for (const args of queryRaw.mock.calls) {
      expect(args).toHaveLength(1)
      expect(args[0]).toEqual(["SELECT 1"])
      expect(args[0].raw).toEqual(["SELECT 1"])
    }
    expect(console.error).not.toHaveBeenCalled()
  })

  it("safely handles duplicate authorized invocations", async () => {
    await expectResponse(await GET(request()), 200)
    await expectResponse(await GET(request()), 200)
    expect(queryRaw).toHaveBeenCalledTimes(6)
    expect(console.error).not.toHaveBeenCalled()
  })

  it.each([0, 1, 2])("stops and sanitizes a failure at query index %s", async (failureIndex) => {
    for (let index = 0; index < failureIndex; index += 1) queryRaw.mockResolvedValueOnce([])
    queryRaw.mockRejectedValueOnce(new Error(`${privateError} ${databaseUrl} ${secret}`))
    await expectResponse(await GET(request()), 503)
    expect(queryRaw).toHaveBeenCalledTimes(failureIndex + 1)
    expect(console.error).toHaveBeenCalledExactlyOnceWith("[keepalive] Database activity failed.")
    expect(console.warn).not.toHaveBeenCalled()
    expect(console.log).not.toHaveBeenCalled()
  })
})

describe("production routing and schedule", () => {
  it("uses dynamic Node.js execution", () => {
    expect(runtime).toBe("nodejs")
    expect(dynamic).toBe("force-dynamic")
  })

  it("configures one daily cron at the implemented route in the client deployment root", () => {
    expect(vercelConfig.$schema).toBe("https://openapi.vercel.sh/vercel.json")
    expect(vercelConfig.crons).toEqual([{ path: "/api/cron/keepalive", schedule: "17 9 * * *" }])
    const [minute, hour, ...calendar] = vercelConfig.crons[0].schedule.split(" ")
    expect(Number(minute)).toBeGreaterThanOrEqual(0)
    expect(Number(minute)).toBeLessThan(60)
    expect(Number(hour)).toBeGreaterThanOrEqual(0)
    expect(Number(hour)).toBeLessThan(24)
    expect(calendar).toEqual(["*", "*", "*"])
  })

  it.each([null, `Bearer ${secret}`])("reaches the endpoint directly without session middleware %#", async (header) => {
    const req = request(header)
    expect(unstable_doesMiddlewareMatch({ config: middlewareConfig, nextConfig: {}, url: req.url })).toBe(false)
    // Execute the selected handler with the production-mode request and no cookies.
    await expectResponse(await GET(req), header ? 200 : 401)
    expect(sessionAccess).not.toHaveBeenCalled()
    expect(unstable_doesMiddlewareMatch({ config: middlewareConfig, nextConfig: {}, url: "/inventory" })).toBe(true)
  })
})
