// @vitest-environment node
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest"
import { POST } from "./route"

const mocks = vi.hoisted(() => ({
  signUp: vi.fn(), createClient: vi.fn(), createProfile: vi.fn(),
  deleteUser: vi.fn(), createUser: vi.fn(),
}))
vi.mock("@supabase/supabase-js", () => ({ createClient: mocks.createClient }))
vi.mock("@/lib/prisma", () => ({ prisma: { user: { create: mocks.createProfile } } }))
vi.mock("@/lib/supabase/server", () => ({
  supabaseAdmin: { auth: { admin: { deleteUser: mocks.deleteUser, createUser: mocks.createUser } } },
}))

const authId = "11111111-2222-4333-8444-555555555555"
const input = { email: "test@example.com", password: "fake-password", fullName: "Test User" }
const sensitive = "FAKE_PROVIDER_SECRET postgresql://fake:fake@localhost/db"
type SignupInput = { email: string; options: { data: { signup_attempt_id: string } } }
function created({ email, options }: SignupInput, session: object | null = null) {
  return {
    data: {
      user: {
        id: authId, email, user_metadata: options.data,
        identities: [{ provider: "email", user_id: authId }],
      },
      session,
    },
    error: null,
  }
}
function request(body: unknown = input) {
  return new Request("http://localhost/api/auth/signup", {
    method: "POST", body: JSON.stringify(body), headers: { "Content-Type": "application/json" },
  })
}
async function safeBody(response: Response) {
  const body = await response.json()
  expect(JSON.stringify(body)).not.toMatch(/FAKE_PROVIDER_SECRET|postgresql:|fake-password|access_token|refresh_token|signup_attempt_id/)
  return body
}

beforeEach(() => {
  vi.resetAllMocks()
  vi.stubEnv("SUPABASE_URL", "https://server.example.invalid")
  vi.stubEnv("SUPABASE_ANON_KEY", "sb_publishable_FAKE_SERVER")
  vi.stubEnv("NEXT_PUBLIC_SUPABASE_URL", "https://browser.example.invalid")
  vi.stubEnv("SUPABASE_SERVICE_ROLE_KEY", "sb_secret_FAKE_NEVER_SIGNUP")
  vi.spyOn(console, "error").mockImplementation(() => {})
  vi.stubGlobal("fetch", vi.fn().mockRejectedValue(new Error("Unmocked network forbidden")))
  mocks.createClient.mockReturnValue({ auth: { signUp: mocks.signUp } })
  mocks.signUp.mockImplementation(async (args: SignupInput) => created(args))
  mocks.createProfile.mockResolvedValue({ id: authId })
  mocks.deleteUser.mockResolvedValue({ data: {}, error: null })
})
afterEach(() => { vi.restoreAllMocks(); vi.unstubAllEnvs(); vi.unstubAllGlobals() })

describe("signup validation", () => {
  it.each([
    null, [], true, "body", {}, { ...input, email: {} }, { ...input, password: [] },
    { ...input, fullName: 5 }, { ...input, email: "invalid" }, { ...input, email: "" },
    { ...input, email: "a".repeat(250) + "@example.com" }, { ...input, fullName: " " },
    { ...input, fullName: "a".repeat(201) }, { ...input, password: "short" },
    { ...input, password: "a".repeat(129) },
  ])("rejects invalid input %# before any provider call", async (body) => {
    const response = await POST(request(body))
    expect(response.status).toBe(400)
    await safeBody(response)
    expect(mocks.createClient).not.toHaveBeenCalled()
    expect(mocks.createProfile).not.toHaveBeenCalled()
    expect(mocks.deleteUser).not.toHaveBeenCalled()
  })
  it("rejects malformed JSON", async () => {
    const response = await POST(new Request("http://localhost", { method: "POST", body: "{" }))
    expect(response.status).toBe(400)
    expect(mocks.signUp).not.toHaveBeenCalled()
  })
})

describe("new identity signup", () => {
  it.each([false, true])("reports confirmationRequired=%s without session data", async (confirmationRequired) => {
    mocks.signUp.mockImplementation(async (args: SignupInput) => created(args,
      confirmationRequired ? null : { access_token: sensitive, refresh_token: sensitive }))
    const response = await POST(request({ ...input, email: " TEST@EXAMPLE.COM ", fullName: " Test User " }))
    expect(response.status).toBe(201)
    expect(await safeBody(response)).toEqual({ message: "Account created successfully.", confirmationRequired })
    expect(response.headers.get("cache-control")).toBe("private, no-store")
    expect(response.headers.has("set-cookie")).toBe(false)
    expect(mocks.createClient).toHaveBeenCalledWith(
      "https://server.example.invalid", "sb_publishable_FAKE_SERVER",
      { auth: { persistSession: false, autoRefreshToken: false, detectSessionInUrl: false } },
    )
    expect(mocks.signUp).toHaveBeenCalledWith({
      email: input.email, password: input.password,
      options: { data: { signup_attempt_id: expect.stringMatching(/^[0-9a-f-]{36}$/) } },
    })
    expect(mocks.createProfile).toHaveBeenCalledExactlyOnceWith({
      data: { id: authId, email: input.email, fullName: input.fullName },
    })
    expect(mocks.createUser).not.toHaveBeenCalled()
    expect(mocks.deleteUser).not.toHaveBeenCalled()
  })
  it("uses a new server marker for every request, ignoring submitted metadata", async () => {
    await POST(request({ ...input, signup_attempt_id: "attacker-controlled", options: { data: { signup_attempt_id: "attacker-controlled" } } }))
    await POST(request())
    const markers = mocks.signUp.mock.calls.map(([args]) => args.options.data.signup_attempt_id)
    expect(new Set(markers).size).toBe(2)
    expect(markers).not.toContain("attacker-controlled")
  })
})

describe("partial failures and existing accounts", () => {
  it.each([
    ["user_already_exists", 422, 409], ["email_exists", 422, 409],
    ["over_request_rate_limit", 422, 429], ["over_email_send_rate_limit", 422, 429],
    ["unknown", 429, 429], ["email_address_invalid", 422, 400],
    ["weak_password", 422, 400], ["validation_failed", 422, 400],
    ["unknown", 500, 500], ["unknown", 400, 400],
  ])("safely maps %s/%i to %i without Prisma or cleanup", async (code, status, expected) => {
    mocks.signUp.mockResolvedValue({ data: { user: null, session: null }, error: { code, status, message: sensitive } })
    const response = await POST(request())
    expect(response.status).toBe(expected)
    await safeBody(response)
    expect(mocks.createProfile).not.toHaveBeenCalled()
    expect(mocks.deleteUser).not.toHaveBeenCalled()
  })
  it("sanitizes thrown provider errors without profile creation or deletion", async () => {
    mocks.signUp.mockRejectedValue(new Error(sensitive))
    const response = await POST(request())
    expect(response.status).toBe(500)
    await safeBody(response)
    expect(mocks.createProfile).not.toHaveBeenCalled()
    expect(mocks.deleteUser).not.toHaveBeenCalled()
    expect(JSON.stringify(vi.mocked(console.error).mock.calls)).not.toContain(sensitive)
  })
  it("does not create a profile when no Auth user is returned", async () => {
    mocks.signUp.mockResolvedValue({ data: { user: null, session: null }, error: null })
    const response = await POST(request())
    expect(response.status).toBe(500)
    await safeBody(response)
    expect(mocks.createProfile).not.toHaveBeenCalled()
    expect(mocks.deleteUser).not.toHaveBeenCalled()
  })
  it.each(["obfuscated", "existing-unconfirmed", "missing-identities", "wrong-identity", "missing-marker"])(
    "never links or deletes a %s identity", async (kind) => {
      mocks.signUp.mockImplementation(async (args: SignupInput) => {
        const result = created(args)
        if (kind === "obfuscated") result.data.user.identities = []
        if (kind === "missing-identities") delete (result.data.user as { identities?: unknown }).identities
        if (kind === "existing-unconfirmed" || kind === "missing-marker") {
          result.data.user.user_metadata = { signup_attempt_id: kind === "missing-marker" ? "" : "old-marker" }
        }
        if (kind === "wrong-identity") result.data.user.identities[0].user_id = "another-user"
        return result
      })
      mocks.createProfile.mockRejectedValue(new Error(sensitive))
      const response = await POST(request())
      expect(response.status).toBe(409)
      await safeBody(response)
      expect(mocks.createProfile).not.toHaveBeenCalled()
      expect(mocks.deleteUser).not.toHaveBeenCalled()
    },
  )
  it.each(["wrong-email", "invalid-id"])("fails closed on %s", async (kind) => {
    mocks.signUp.mockImplementation(async (args: SignupInput) => {
      const result = created(args)
      if (kind === "wrong-email") result.data.user.email = "different@example.com"
      else result.data.user.id = "not-a-uuid"
      return result
    })
    expect((await POST(request())).status).toBe(500)
    expect(mocks.createProfile).not.toHaveBeenCalled()
    expect(mocks.deleteUser).not.toHaveBeenCalled()
  })
  it.each([false, true])("compensates only the new UUID (immediate session: %s) and returns a safe failure", async (immediate) => {
    mocks.signUp.mockImplementation(async (args: SignupInput) => created(args, immediate ? { access_token: sensitive } : null))
    mocks.createProfile.mockRejectedValue(new Error(sensitive))
    const response = await POST(request())
    expect(response.status).toBe(500)
    await safeBody(response)
    expect(mocks.deleteUser).toHaveBeenCalledExactlyOnceWith(authId)
    expect(mocks.createUser).not.toHaveBeenCalled()
    expect(console.error).not.toHaveBeenCalled()
  })
  it.each(["returned-error", "thrown-error"])("logs a sanitized CRITICAL event for %s during compensation", async (kind) => {
    mocks.createProfile.mockRejectedValue(new Error(sensitive))
    if (kind === "returned-error") mocks.deleteUser.mockResolvedValue({ error: { message: sensitive } })
    else mocks.deleteUser.mockRejectedValue(new Error(sensitive))
    const response = await POST(request())
    expect(response.status).toBe(500)
    await safeBody(response)
    expect(mocks.deleteUser).toHaveBeenCalledExactlyOnceWith(authId)
    expect(console.error).toHaveBeenCalledExactlyOnceWith({
      severity: "CRITICAL", event: "SIGNUP_COMPENSATION_FAILED",
      message: expect.stringContaining("Manual reconciliation required"),
      authUserId: authId, signupAttemptId: expect.any(String),
    })
    const logs = JSON.stringify(vi.mocked(console.error).mock.calls)
    expect(logs).not.toMatch(/FAKE_PROVIDER_SECRET|postgresql:|fake-password|test@example.com/)
  })
})
