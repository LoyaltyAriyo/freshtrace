import "server-only"
import { createHash, timingSafeEqual } from "node:crypto"

export const runtime = "nodejs"
export const dynamic = "force-dynamic"

function reply(status: number) {
  return Response.json({ ok: status === 200 }, {
    status,
    headers: { "Cache-Control": "no-store", ...(status === 405 ? { Allow: "GET" } : {}) },
  })
}

export async function GET(request: Request) {
  // Next.js automatically delegates HEAD to GET when no HEAD handler is exported.
  if (request.method !== "GET") return reply(405)

  const secret = process.env.CRON_SECRET
  if (!secret || secret.length < 16) return reply(503)

  // Equal-sized digests avoid secret-length comparisons. No trimming or scheme
  // normalization: Vercel must send the exact Bearer header.
  const supplied = request.headers.get("authorization") ?? ""
  const digest = (value: string) => createHash("sha256").update(value).digest()
  if (!timingSafeEqual(digest(supplied), digest(`Bearer ${secret}`))) return reply(401)

  // Validate configuration before loading the singleton, which validates at import.
  try {
    const url = new URL(process.env.DATABASE_URL ?? "")
    if (!["postgres:", "postgresql:"].includes(url.protocol) || !url.hostname ||
        url.pathname.length < 2) return reply(503)
  } catch {
    return reply(503)
  }

  try {
    const { prisma } = await import("@/lib/prisma")
    for (let query = 0; query < 3; query += 1) {
      await prisma.$queryRaw`SELECT 1`
    }
    return reply(200)
  } catch {
    // The application logger persists to PostgreSQL and must not be used here.
    console.error("[keepalive] Database activity failed.")
    return reply(503)
  }
}
