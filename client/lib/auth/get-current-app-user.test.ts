// @vitest-environment node
import { expect, it, vi } from "vitest"
import type { CookieMethodsServer } from "@supabase/ssr"

const mocks = vi.hoisted(() => ({
  set: vi.fn(() => { throw new Error("Cannot write cookies in a Server Component") }),
  findUnique: vi.fn().mockResolvedValue({ id: "user-1", role: "USER" }),
}))
vi.mock("next/headers", () => ({ cookies: async () => ({ getAll: () => [], set: mocks.set }) }))
vi.mock("@/lib/prisma", () => ({ prisma: { user: { findUnique: mocks.findUnique } } }))
vi.mock("@supabase/ssr", () => ({
  createServerClient: (_url: string, _key: string, { cookies }: { cookies: CookieMethodsServer }) => ({ auth: {
    getUser: async () => {
      await cookies.setAll!([{ name: "session", value: "fresh", options: {} }], {})
      return { data: { user: { id: "user-1" } } }
    },
  } }),
}))
import { getCurrentAppUser } from "./get-current-app-user"

it("renders the authenticated profile without attempting forbidden component cookie writes", async () => {
  await expect(getCurrentAppUser()).resolves.toEqual({ id: "user-1", role: "USER" })
  expect(mocks.set).not.toHaveBeenCalled()
  expect(mocks.findUnique).toHaveBeenCalledWith(expect.objectContaining({ where: { id: "user-1" } }))
})
