/* @vitest-environment node */
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest"

const mocks = vi.hoisted(() => ({
  load: vi.fn(),
  disconnect: vi.fn(),
  client: vi.fn(),
  promote: vi.fn(),
}))
vi.mock("./load-client-environment.mjs", () => ({ loadClientEnvironment: mocks.load }))
vi.mock("@supabase/supabase-js", () => ({ createClient: mocks.client }))
vi.mock("../generated/prisma-client/index.js", () => ({
  default: { PrismaClient: class { $disconnect = mocks.disconnect } },
}))
vi.mock("./admin-promotion.mjs", async (importOriginal) => ({
  ...await importOriginal(),
  promoteExistingAdmin: mocks.promote,
}))

import { runBootstrap } from "./bootstrap-admin.mjs"

describe("bootstrap entry point", () => {
  beforeEach(() => {
    vi.clearAllMocks()
    mocks.disconnect.mockResolvedValue(undefined)
    mocks.client.mockReturnValue({ auth: { admin: {} } })
    vi.stubEnv("DATABASE_URL", "postgresql://fake:fake@127.0.0.1:65535/offline")
    vi.stubEnv("SUPABASE_URL", "http://127.0.0.1:65535")
    vi.stubEnv("SUPABASE_SERVICE_ROLE_KEY", "synthetic-key")
    vi.spyOn(console, "log").mockImplementation(() => {})
    vi.spyOn(console, "error").mockImplementation(() => {})
  })

  afterEach(() => {
    vi.unstubAllEnvs()
    vi.restoreAllMocks()
  })

  it("does not load credentials or run operations merely on import", async () => {
    await import("./bootstrap-admin.mjs")
    expect(mocks.load).not.toHaveBeenCalled()
    expect(mocks.client).not.toHaveBeenCalled()
    expect(mocks.promote).not.toHaveBeenCalled()
  })

  it("loads the normal environment and disables session persistence and refresh", async () => {
    mocks.promote.mockResolvedValue({ outcome: "PROMOTED", applicationUsersUpdated: 1 })
    expect(await runBootstrap()).toBe(0)
    expect(mocks.load).toHaveBeenCalledOnce()
    expect(mocks.client).toHaveBeenCalledWith(expect.any(String), expect.any(String), {
      auth: { persistSession: false, autoRefreshToken: false, detectSessionInUrl: false },
    })
    expect(console.log).toHaveBeenCalledWith(
      '{"outcome":"PROMOTED","applicationUsersUpdated":1}')
    expect(mocks.disconnect).toHaveBeenCalledOnce()
  })

  it("fails before client creation when server configuration is missing", async () => {
    vi.stubEnv("DATABASE_URL", "")
    expect(await runBootstrap()).toBe(1)
    expect(mocks.client).not.toHaveBeenCalled()
    expect(mocks.promote).not.toHaveBeenCalled()
  })

  it("sanitizes provider failures and still disconnects", async () => {
    mocks.promote.mockRejectedValue(new Error("private SQL UUID password token"))
    expect(await runBootstrap()).toBe(1)
    expect(console.error).toHaveBeenCalledExactlyOnceWith(
      "Admin promotion refused: operation failed; inspect server connectivity and account prerequisites.")
    expect(console.log).not.toHaveBeenCalled()
    expect(mocks.disconnect).toHaveBeenCalledOnce()
  })
})
