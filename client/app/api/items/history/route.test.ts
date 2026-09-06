/* @vitest-environment node */
import { beforeEach, describe, expect, it, vi } from "vitest"
import { Buffer } from "node:buffer"
import { GET } from "./route"

const mocks = vi.hoisted(() => ({
  user: vi.fn(), used: vi.fn(), wasted: vi.fn(), log: vi.fn(),
}))
vi.mock("@/lib/auth", () => ({ getCurrentUserId: mocks.user }))
vi.mock("@/lib/prisma", () => ({ prisma: {
  usedItem: { findMany: mocks.used }, wastedItem: { findMany: mocks.wasted },
} }))
vi.mock("@/lib/logger", () => ({ logError: mocks.log }))

const at = new Date("2026-04-10T12:00:00.000Z")
function row(id: string, owner: string | null = "user-a", date = at) {
  return {
    id, foodItemId: `food-${id}`, name: "Historical apples", quantity: 3,
    categoryId: "snapshot-category", category: { name: "Produce" },
    markedUsedAt: date, markedWastedAt: date,
    foodItem: { userId: owner, name: "Edited source name", quantity: 99,
      categoryId: "changed-category", dateAdded: new Date("2026-04-01T00:00:00.000Z") },
  }
}
type Row = ReturnType<typeof row>
type Query = {
  where: { foodItem: { userId: string }; OR?: Record<string, unknown>[] }
  orderBy: Record<string, "desc">[]
  take: number
}

// Simulate database ownership and keyset semantics against mixed-user fixtures.
function database(rows: Row[], field: "markedUsedAt" | "markedWastedAt") {
  return async ({ where, take }: Query) => {
    const bounds = where.OR
    const date = bounds ? (bounds[0][field] as { lt: Date }).lt : null
    const id = bounds ? (bounds[1].id as { lt: string }).lt : null
    return rows.filter((r) => r.foodItem.userId === where.foodItem.userId)
      .filter((r) => !date || r[field] < date || (+r[field] === +date && r.id < id!))
      .sort((a, b) => +b[field] - +a[field] || b.id.localeCompare(a.id))
      .slice(0, take)
  }
}
function request(query = "status=USED") {
  return GET(new Request(`http://localhost/api/items/history?${query}`))
}
function cursor(value: unknown) {
  return Buffer.from(JSON.stringify(value)).toString("base64url")
}

beforeEach(() => {
  vi.resetAllMocks()
  mocks.user.mockResolvedValue("user-a")
  mocks.used.mockResolvedValue([])
  mocks.wasted.mockResolvedValue([])
  mocks.log.mockResolvedValue(undefined)
})

describe("GET /api/items/history", () => {
  it("requires authentication before accessing history", async () => {
    mocks.user.mockResolvedValue(null)
    expect((await request()).status).toBe(401)
    expect(mocks.used).not.toHaveBeenCalled()
    expect(mocks.wasted).not.toHaveBeenCalled()
  })

  it.each(["", "status=ACTIVE", "status=used", "status=USED&status=WASTED"])(
    "rejects missing or unsupported status: %s", async (query) => {
      expect((await request(query)).status).toBe(400)
      expect(mocks.used).not.toHaveBeenCalled()
      expect(mocks.wasted).not.toHaveBeenCalled()
    },
  )

  it.each(["USED", "WASTED"] as const)("returns owner-scoped %s snapshots, newest first", async (status) => {
    const selected = status === "USED" ? mocks.used : mocks.wasted
    const other = status === "USED" ? mocks.wasted : mocks.used
    const field = status === "USED" ? "markedUsedAt" : "markedWastedAt"
    selected.mockImplementation(database([
      row("old", "user-a", new Date("2026-04-02T00:00:00.000Z")),
      row("other", "user-b"), row("deleted", null), row("new"),
    ], field))
    const response = await request(`status=${status}`)
    expect(response.status).toBe(200)
    expect(response.headers.get("cache-control")).toBe("private, no-store")
    expect(response.headers.get("vary")).toBe("Cookie")
    const body = await response.json()
    expect(body.items.map((r: { id: string }) => r.id)).toEqual(["new", "old"])
    expect(body.items[0]).toEqual({
      id: "new", foodItemId: "food-new", name: "Historical apples", quantity: 3,
      categoryId: "snapshot-category", categoryName: "Produce",
      dateAdded: "2026-04-01T00:00:00.000Z", status,
      usedAt: status === "USED" ? at.toISOString() : null,
      wastedAt: status === "WASTED" ? at.toISOString() : null,
    })
    expect(selected).toHaveBeenCalledWith(expect.objectContaining({
      where: { foodItem: { userId: "user-a" } },
      orderBy: [{ [field]: "desc" }, { id: "desc" }], take: 21,
      select: expect.objectContaining({ name: true, quantity: true, categoryId: true,
        foodItem: { select: { dateAdded: true } } }),
    }))
    expect(body.pagination).toEqual({ limit: 20, hasMore: false, nextCursor: null })
    expect(other).not.toHaveBeenCalled()
    expect(JSON.stringify(body)).not.toMatch(/user-a|user-b|Edited source|changed-category/)
  })

  it.each([1, 20, 50])("accepts bounded limit %i with one lookahead row", async (limit) => {
    await request(`status=USED&limit=${limit}`)
    expect(mocks.used).toHaveBeenCalledWith(expect.objectContaining({ take: limit + 1 }))
  })

  it.each(["0", "-1", "51", "9999999999999999", "1.5", "abc", "", "01", "1e1", " 20"])(
    "rejects malformed/out-of-range limit %s", async (limit) => {
      expect((await request(`status=USED&limit=${encodeURIComponent(limit)}`)).status).toBe(400)
      expect(mocks.used).not.toHaveBeenCalled()
    },
  )

  it("rejects repeated pagination parameters", async () => {
    expect((await request("status=USED&limit=20&limit=30")).status).toBe(400)
    expect((await request("status=USED&cursor=a&cursor=b")).status).toBe(400)
  })

  it.each(["USED", "WASTED"] as const)("paginates %s ties without overlap, even after anchor deletion", async (status) => {
    const selected = status === "USED" ? mocks.used : mocks.wasted
    const field = status === "USED" ? "markedUsedAt" : "markedWastedAt"
    let rows = [row("c"), row("b"), row("a"), row("z", "user-b")]
    selected.mockImplementation((query: Query) => database(rows, field)(query))
    const first = await (await request(`status=${status}&limit=2`)).json()
    expect(first.items.map((r: { id: string }) => r.id)).toEqual(["c", "b"])
    expect(first.pagination.hasMore).toBe(true)
    expect(first.pagination.nextCursor).toEqual(expect.any(String))
    rows = rows.filter((r) => r.id !== "b")
    rows.push(row("newer", "user-a", new Date("2026-04-11T00:00:00.000Z")))
    const second = await (await request(`status=${status}&limit=2&cursor=${first.pagination.nextCursor}`)).json()
    expect(second.items.map((r: { id: string }) => r.id)).toEqual(["a"])
    expect(second.pagination).toEqual({ limit: 2, nextCursor: null, hasMore: false })
    expect(selected.mock.calls[1][0].where.foodItem).toEqual({ userId: "user-a" })
  })

  it.each([
    "", "not!base64", "a".repeat(513), cursor(null), cursor([]),
    cursor({ v: 1, status: "USED", id: "a", at: "invalid" }),
    cursor({ v: 1, status: "USED", id: "../bad", at: at.toISOString() }),
    cursor({ v: 2, status: "USED", id: "a", at: at.toISOString() }),
    cursor({ v: 1, status: "WASTED", id: "a", at: at.toISOString() }),
  ])("rejects malformed or cross-status cursor %s", async (value) => {
    expect((await request(`status=USED&cursor=${encodeURIComponent(value)}`)).status).toBe(400)
    expect(mocks.used).not.toHaveBeenCalled()
  })

  it("returns only safe errors when the database fails", async () => {
    mocks.used.mockRejectedValue(new Error("private database detail"))
    const response = await request()
    expect(response.status).toBe(500)
    expect(await response.json()).toEqual({ error: "Unable to load item history. Please try again." })
    expect(JSON.stringify(mocks.log.mock.calls)).not.toContain("private database detail")
  })
})
