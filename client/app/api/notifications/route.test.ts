import { afterEach, beforeEach, describe, expect, it, vi } from "vitest"

vi.mock("@/lib/prisma", () => {
  const findManyMock = vi.fn()
  const notificationFindManyMock = vi.fn()
  return {
    prisma: {
      foodItem: {
        findMany: findManyMock,
      },
      notification: {
        findMany: notificationFindManyMock,
      },
    },
    findManyMock,
    notificationFindManyMock,
  }
})

vi.mock("@/lib/auth", () => {
  return {
    getCurrentUserId: vi.fn().mockResolvedValue("user-123"),
  }
})

import { GET } from "./route"
// @ts-expect-error - test-only mocked export
import { findManyMock, notificationFindManyMock } from "@/lib/prisma"
import { getCurrentUserId } from "@/lib/auth"

const FIXED_NOW = new Date("2026-04-07T12:00:00.000Z")

function daysAgo(days: number): Date {
  const d = new Date(FIXED_NOW)
  d.setDate(d.getDate() - days)
  return d
}

describe("GET /api/notifications", () => {
  beforeEach(() => {
    findManyMock.mockReset()
    notificationFindManyMock.mockReset()
    vi.mocked(getCurrentUserId).mockResolvedValue("user-123")
    notificationFindManyMock.mockResolvedValue([])
    vi.setSystemTime(FIXED_NOW)
  })

  afterEach(() => {
    vi.useRealTimers()
  })

  it("returns empty notifications when all items are fresh", async () => {
    findManyMock.mockResolvedValue([
      { id: "item-1", name: "Milk", dateAdded: daysAgo(1), category: { name: "Dairy" } },
    ])

    const response = await GET(new Request("http://localhost/api/notifications"))
    const body = await response.json()

    expect(response.status).toBe(200)
    expect(body.notifications).toHaveLength(0)
    expect(body.count).toBe(0)
  })

  it("returns a warning notification for expired items", async () => {
    findManyMock.mockResolvedValue([
      { id: "item-1", name: "Chicken", dateAdded: daysAgo(10), category: { name: "Meat" } },
    ])

    const response = await GET(new Request("http://localhost/api/notifications"))
    const body = await response.json()

    expect(response.status).toBe(200)
    expect(body.notifications).toHaveLength(1)
    expect(body.notifications[0].type).toBe("warning")
    expect(body.notifications[0].message).toMatch(/expired/i)
    expect(body.notifications[0].id).toBe("expired-item-1")
  })

  it("returns a reminder notification for items expiring very soon", async () => {
    // Meat shelf life is 3 days, 25% threshold = 1 day
    findManyMock.mockResolvedValue([
      { id: "item-2", name: "Salmon", dateAdded: daysAgo(2), category: { name: "Meat" } },
    ])

    const response = await GET(new Request("http://localhost/api/notifications"))
    const body = await response.json()

    expect(response.status).toBe(200)
    expect(body.notifications).toHaveLength(1)
    expect(body.notifications[0].type).toBe("reminder")
    expect(body.notifications[0].id).toBe("use-first-item-2")
  })

  it("returns an info notification for items approaching use-by", async () => {
    // Dairy shelf life is 10 days, 50% threshold = 5 days, 25% = 3 days
    // Added 6 days ago → 4 days left → between 25% and 50%
    findManyMock.mockResolvedValue([
      { id: "item-3", name: "Yogurt", dateAdded: daysAgo(6), category: { name: "Dairy" } },
    ])

    const response = await GET(new Request("http://localhost/api/notifications"))
    const body = await response.json()

    expect(response.status).toBe(200)
    expect(body.notifications).toHaveLength(1)
    expect(body.notifications[0].type).toBe("info")
    expect(body.notifications[0].id).toBe("use-soon-item-3")
  })

  it("returns no notification for items with plenty of time left", async () => {
    // Pantry shelf life is 60 days, added 1 day ago → 59 days left
    findManyMock.mockResolvedValue([
      { id: "item-4", name: "Rice", dateAdded: daysAgo(1), category: { name: "Pantry" } },
    ])

    const response = await GET(new Request("http://localhost/api/notifications"))
    const body = await response.json()

    expect(response.status).toBe(200)
    expect(body.notifications).toHaveLength(0)
  })

  it("returns multiple notifications for multiple items", async () => {
    findManyMock.mockResolvedValue([
      { id: "item-1", name: "Chicken", dateAdded: daysAgo(10), category: { name: "Meat" } },
      { id: "item-2", name: "Milk", dateAdded: daysAgo(1), category: { name: "Dairy" } },
      { id: "item-3", name: "Salmon", dateAdded: daysAgo(2), category: { name: "Seafood" } },
    ])

    const response = await GET(new Request("http://localhost/api/notifications"))
    const body = await response.json()

    expect(response.status).toBe(200)
    expect(body.count).toBe(body.notifications.length)
    expect(body.notifications.length).toBeGreaterThan(0)
  })

  it("returns 500 when database query fails", async () => {
    findManyMock.mockRejectedValue(new Error("DB error"))

    const response = await GET(new Request("http://localhost/api/notifications"))
    const body = await response.json()

    expect(response.status).toBe(500)
    expect(body.error).toMatch(/failed to fetch notifications/i)
  })

  it("returns 401 when user is not authenticated", async () => {
    vi.mocked(getCurrentUserId).mockResolvedValue(null)

    const response = await GET(new Request("http://localhost/api/notifications"))
    const body = await response.json()

    expect(response.status).toBe(401)
    expect(body.error).toMatch(/signed in/i)
    expect(findManyMock).not.toHaveBeenCalled()
  })

  it("includes persisted notifications and sorts them newest first", async () => {
    findManyMock.mockResolvedValue([
      { id: "item-1", name: "Chicken", dateAdded: daysAgo(10), category: { name: "Meat" } },
    ])
    notificationFindManyMock.mockResolvedValue([
      {
        id: "notif-1",
        message: "You marked Milk as used.",
        type: "INFO",
        isRead: false,
        createdAt: new Date("2026-04-07T14:00:00.000Z"),
      },
    ])

    const response = await GET(new Request("http://localhost/api/notifications"))
    const body = await response.json()

    expect(response.status).toBe(200)
    expect(body.notifications).toHaveLength(2)
    expect(body.notifications[0]).toMatchObject({
      id: "notif-1",
      message: "You marked Milk as used.",
      type: "info",
      read: false,
    })
    expect(findManyMock).toHaveBeenCalledWith(
      expect.objectContaining({
        where: expect.objectContaining({
          status: "ACTIVE",
          userId: "user-123",
        }),
      })
    )
    expect(notificationFindManyMock).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { userId: "user-123" },
      })
    )
  })
})
