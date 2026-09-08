/* @vitest-environment node */
import { describe, expect, it, vi } from "vitest"
import { promoteExistingAdmin, safeFailureMessage } from "./admin-promotion.mjs"

const email = "verified@example.test"
const id = "11111111-1111-4111-8111-111111111111"
const auth = {
  id, email: "Verified@Example.Test",
  email_confirmed_at: "2026-01-01T00:00:00Z",
  user_metadata: { full_name: "Synthetic User" },
  app_metadata: {}, identities: [], last_sign_in_at: "2026-01-02T00:00:00Z",
}
const profile = {
  id, email, fullName: "Preserved Synthetic Name",
  role: "USER", accountStatus: "DISABLED",
  createdAt: new Date("2026-01-01"), updatedAt: new Date("2026-01-01"),
  receipts: [{ id: "receipt-fixture" }],
  foodItems: [{ id: "item-fixture" }],
  notifications: [{ id: "notification-fixture" }],
}

function fixture({ pages = [[auth], []], profiles = [profile] } = {}) {
  let rows = structuredClone(profiles)
  const user = {
    findMany: vi.fn(async () => structuredClone(rows)),
    count: vi.fn(async () => rows.length),
    updateMany: vi.fn(async ({ where, data }) => {
      const row = rows.find((row) => Object.entries(where).every(([key, value]) =>
        key === "updatedAt" ? +row[key] === +value : row[key] === value))
      if (!row) return { count: 0 }
      Object.assign(row, data, { updatedAt: new Date("2026-02-01") })
      return { count: 1 }
    }),
    create: vi.fn(), upsert: vi.fn(), delete: vi.fn(),
  }
  const prisma = {
    $transaction: vi.fn(async (fn) => {
      const before = structuredClone(rows)
      try { return await fn({ user }) }
      catch (error) { rows = before; throw error }
    }),
  }
  const admin = {
    listUsers: vi.fn(async ({ page }) => ({
      data: { users: structuredClone(pages[page - 1] ?? []), nextPage: 1 },
      error: null,
    })),
    getUserById: vi.fn(async () => ({ data: { user: structuredClone(auth) }, error: null })),
    createUser: vi.fn(), updateUserById: vi.fn(), deleteUser: vi.fn(), signOut: vi.fn(),
  }
  const env = { ADMIN_EMAIL: "  VERIFIED@example.test " }
  Object.defineProperty(env, "ADMIN_PASSWORD", {
    get() { throw new Error("Password must never be accessed") },
  })
  Object.defineProperty(env, "ADMIN_FULL_NAME", {
    get() { throw new Error("Full name must never be accessed") },
  })
  return {
    env, prisma, admin, user,
    rows: () => rows,
    run: () => promoteExistingAdmin({ env, prisma, admin }),
  }
}

function expectNoAuthWrites(f) {
  for (const method of ["createUser", "updateUserById", "deleteUser", "signOut"]) {
    expect(f.admin[method]).not.toHaveBeenCalled()
  }
  expect(f.user.create).not.toHaveBeenCalled()
  expect(f.user.upsert).not.toHaveBeenCalled()
  expect(f.user.delete).not.toHaveBeenCalled()
}

async function expectRefusal(f, code) {
  await expect(f.run()).rejects.toThrow(code)
  expect(f.user.updateMany).not.toHaveBeenCalled()
  expectNoAuthWrites(f)
}

describe("existing admin promotion", () => {
  it("promotes only the confirmed matching profile and preserves its identity and relations", async () => {
    const f = fixture()
    const result = await f.run()
    expect(result).toMatchObject({
      outcome: "PROMOTED", role: "ADMIN", accountStatus: "ACTIVE",
      authUsersCreated: 0, applicationUsersCreated: 0, applicationUsersUpdated: 1,
      emailConfirmed: true, identitiesMatch: true, relatedRecordsPreserved: true,
      relatedRecordCounts: { receipts: 1, foodItems: 1, notifications: 1 },
    })
    expect(f.user.updateMany).toHaveBeenCalledExactlyOnceWith({
      where: {
        id, email, fullName: profile.fullName, role: "USER",
        accountStatus: "DISABLED", updatedAt: profile.updatedAt,
      },
      data: { role: "ADMIN", accountStatus: "ACTIVE" },
    })
    expect(f.rows()[0]).toEqual({ ...profile, role: "ADMIN", accountStatus: "ACTIVE",
      updatedAt: new Date("2026-02-01") })
    expect(f.user.findMany).toHaveBeenCalledWith(expect.objectContaining({
      where: { email: { equals: email, mode: "insensitive" } }, take: 2,
    }))
    expectNoAuthWrites(f)
  })

  it("does not need or read a password or full-name setting for existing promotion", async () => {
    const f = fixture()
    await expect(f.run()).resolves.toMatchObject({ outcome: "PROMOTED" })
  })

  it("rejects missing ADMIN_EMAIL before querying or mutating", async () => {
    const f = fixture()
    f.env.ADMIN_EMAIL = " "
    await expectRefusal(f, "EMAIL_REQUIRED")
    expect(f.admin.listUsers).not.toHaveBeenCalled()
  })

  it.each([null, "", "invalid date"])("rejects unconfirmed Auth accounts (%s)", async (date) => {
    await expectRefusal(fixture({ pages: [[{ ...auth, email_confirmed_at: date }], []] }),
      "AUTH_UNCONFIRMED")
  })

  it("refuses to create a missing Auth account by default", async () => {
    await expectRefusal(fixture({ pages: [[]] }), "AUTH_MISSING")
  })

  it("rejects explicit creation mode without accessing a password", async () => {
    const f = fixture({ pages: [[]] })
    f.env.ADMIN_CREATE_IF_MISSING = "true"
    await expectRefusal(f, "CREATION_UNSUPPORTED")
    expect(f.admin.listUsers).not.toHaveBeenCalled()
  })

  it("rejects missing Prisma profiles", async () => {
    await expectRefusal(fixture({ profiles: [] }), "PROFILE_MISSING")
  })

  it("rejects mismatched UUIDs", async () => {
    await expectRefusal(fixture({ profiles: [{ ...profile, id: "different-fixture-id" }] }),
      "ID_MISMATCH")
  })

  it("rejects duplicate case-insensitive Prisma matches", async () => {
    await expectRefusal(fixture({ profiles: [profile, { ...profile, id: "duplicate",
      email: email.toUpperCase() }] }), "PROFILE_DUPLICATE")
  })

  it("continues past a match to detect duplicate Auth emails on later pages", async () => {
    const f = fixture({ pages: [[auth], [{ ...auth, id: "duplicate", email }], []] })
    await expectRefusal(f, "AUTH_DUPLICATE")
    expect(f.admin.listUsers).toHaveBeenCalledTimes(3)
  })

  it("finds matches beyond page ten even when metadata is truncated or page sizes are clamped", async () => {
    const pages = Array.from({ length: 11 }, (_, i) => [{ ...auth,
      id: `other-${i}`, email: `other-${i}@example.test` }])
    pages.push([auth], [])
    const f = fixture({ pages })
    await expect(f.run()).resolves.toMatchObject({ outcome: "PROMOTED" })
    expect(f.admin.listUsers).toHaveBeenCalledWith({ page: 12, perPage: 1000 })
    expect(f.admin.listUsers).toHaveBeenCalledWith({ page: 13, perPage: 1000 })
  })

  it("fails closed on a later pagination error", async () => {
    const f = fixture()
    f.admin.listUsers.mockResolvedValueOnce({ data: { users: [auth] }, error: null })
      .mockResolvedValueOnce({ error: new Error("sensitive provider details") })
    await expectRefusal(f, "AUTH_LOOKUP_FAILED")
  })

  it("rejects repeated pages instead of looping or mistaking them for unique matches", async () => {
    await expectRefusal(fixture({ pages: [[auth], [auth], []] }), "AUTH_PAGINATION_INVALID")
  })

  it("rejects incomplete pagination reported by the server total", async () => {
    const f = fixture()
    f.admin.listUsers.mockResolvedValueOnce({ data: { users: [auth], total: 2 }, error: null })
      .mockResolvedValueOnce({ data: { users: [], total: 2 }, error: null })
    await expectRefusal(f, "AUTH_PAGINATION_INVALID")
  })

  it("is idempotent on a second run including timestamps", async () => {
    const f = fixture()
    await f.run()
    const promoted = structuredClone(f.rows())
    f.user.updateMany.mockClear()
    await expect(f.run()).resolves.toMatchObject({
      outcome: "ALREADY_ADMIN", applicationUsersUpdated: 0,
    })
    expect(f.rows()).toEqual(promoted)
    expect(f.user.updateMany).not.toHaveBeenCalled()
    expectNoAuthWrites(f)
  })

  it("rejects confirmation changes immediately before mutation", async () => {
    const f = fixture()
    f.admin.getUserById.mockResolvedValue({
      data: { user: { ...auth, email_confirmed_at: null } }, error: null,
    })
    await expectRefusal(f, "PRECONDITION_CHANGED")
  })

  it("rolls back if post-update verification detects changed Auth state", async () => {
    const f = fixture()
    f.admin.listUsers
      .mockResolvedValueOnce({ data: { users: [auth] }, error: null })
      .mockResolvedValueOnce({ data: { users: [] }, error: null })
      .mockResolvedValueOnce({ data: { users: [{ ...auth, email_confirmed_at: null }] }, error: null })
      .mockResolvedValueOnce({ data: { users: [] }, error: null })
    await expect(f.run()).rejects.toThrow("VERIFICATION_FAILED")
    expect(f.rows()).toEqual([profile])
    expectNoAuthWrites(f)
  })

  it("never exposes provider errors or private fields in messages and reports", async () => {
    const f = fixture()
    const result = JSON.stringify(await f.run())
    for (const privateValue of [email, id, profile.fullName, auth.email]) {
      expect(result).not.toContain(privateValue)
    }
    expect(safeFailureMessage(new Error("private email password url token"))).not.toMatch(
      /private email password url token/)
    try { await fixture({ profiles: [] }).run() }
    catch (error) {
      expect(safeFailureMessage(error)).toBe(
        "Admin promotion refused: An existing application profile is required.")
    }
  })
})
