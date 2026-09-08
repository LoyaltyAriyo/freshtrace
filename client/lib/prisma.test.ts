// @vitest-environment node
import { afterEach, expect, it, vi } from "vitest"

const { construct } = vi.hoisted(() => ({ construct: vi.fn() }))
vi.mock("../generated/prisma-client", () => ({
  PrismaClient: class {
    constructor(options: unknown) { construct(options) }
  },
}))

afterEach(() => { vi.unstubAllEnvs(); vi.resetModules(); construct.mockClear() })

it("disables automatic raw Prisma error logging while retaining the existing singleton", async () => {
  vi.stubEnv("NODE_ENV", "production")
  vi.stubEnv("DATABASE_URL", "postgresql://fake:fake@127.0.0.1:65535/offline")
  const first = await import("./prisma")
  const second = await import("./prisma")
  expect(first.prisma).toBe(second.prisma)
  expect(construct).toHaveBeenCalledExactlyOnceWith({
    log: [], datasources: { db: { url: "postgresql://fake:fake@127.0.0.1:65535/offline" } },
  })
})
