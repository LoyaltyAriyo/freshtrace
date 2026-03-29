import { describe, expect, it } from "vitest"

// This is a lightweight safety net to ensure that the generated Prisma Client
// is in sync with the schema and actually exposes the WastedItem model that
// the /api/items/[id]/wasted route relies on.

describe("Prisma Client WastedItem model", () => {
  it("exposes WastedItem in the Prisma ModelName enum", async () => {
    const { Prisma } = await import("../generated/prisma-client")

    expect(Prisma).toBeDefined()
    expect(Prisma.ModelName).toBeDefined()
    expect(Prisma.ModelName.WastedItem).toBe("WastedItem")
  })
})
