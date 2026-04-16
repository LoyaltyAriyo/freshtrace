import { beforeEach, describe, expect, it, vi } from "vitest"

vi.mock("@/lib/prisma", () => {
  const createMock = vi.fn()

  return {
    prisma: {
      errorLog: {
        create: createMock,
      },
    },
    createMock,
  }
})

import { logError } from "./logger"
// @ts-expect-error - test-only mocked export
import { createMock } from "@/lib/prisma"

describe("logError", () => {
  beforeEach(() => {
    createMock.mockReset()
  })

  it("persists error details to the ErrorLog table", async () => {
    createMock.mockResolvedValue({ id: "log-1" })

    const error = new Error("db down")

    await logError({
      message: "Failed to fetch food items.",
      error,
      errorType: "FOOD_ITEMS_FETCH_FAILED",
      source: "API",
      details: { route: "GET /api/items" },
    })

    expect(createMock).toHaveBeenCalledWith({
      data: {
        message: "Failed to fetch food items.",
        errorType: "FOOD_ITEMS_FETCH_FAILED",
        severity: "ERROR",
        source: "API",
        details: {
          context: { route: "GET /api/items" },
          error: {
            name: "Error",
            message: "db down",
          },
        },
        stackTrace: expect.any(String),
      },
    })
  })

  it("does not throw when persisting the error log fails", async () => {
    createMock.mockRejectedValue(new Error("write failed"))

    await expect(
      logError({
        message: "Failed to fetch analytics.",
        error: new Error("query failed"),
        errorType: "ANALYTICS_FETCH_FAILED",
        source: "DB",
      })
    ).resolves.toBeUndefined()
  })
})
