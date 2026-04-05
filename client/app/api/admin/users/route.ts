import { NextResponse } from "next/server"

import type { Prisma } from "@/generated/prisma-client"

import { requireAdmin } from "@/lib/auth/require-admin"
import { prisma } from "@/lib/prisma"

function parseUserListQuery(url: URL): { ok: true; where: Prisma.UserWhereInput } | { ok: false; response: NextResponse } {
  const q = url.searchParams.get("q")?.trim() ?? ""
  const statusRaw = url.searchParams.get("status")?.trim().toUpperCase() ?? ""

  if (statusRaw && statusRaw !== "ALL" && statusRaw !== "ACTIVE" && statusRaw !== "DISABLED") {
    return {
      ok: false,
      response: NextResponse.json(
        { error: 'Invalid status. Use "all", "ACTIVE", or "DISABLED".' },
        { status: 400 },
      ),
    }
  }

  const where: Prisma.UserWhereInput = {}

  if (statusRaw === "ACTIVE" || statusRaw === "DISABLED") {
    where.accountStatus = statusRaw
  }

  if (q.length > 0) {
    where.OR = [
      { fullName: { contains: q, mode: "insensitive" } },
      { email: { contains: q, mode: "insensitive" } },
    ]
  }

  return { ok: true, where }
}

export async function GET(request: Request) {
  const auth = await requireAdmin()
  if (!auth.ok) {
    return auth.response
  }

  const parsed = parseUserListQuery(new URL(request.url))
  if (!parsed.ok) {
    return parsed.response
  }

  try {
    const rows = await prisma.user.findMany({
      where: parsed.where,
      orderBy: { createdAt: "desc" },
      select: {
        id: true,
        email: true,
        fullName: true,
        accountStatus: true,
      },
    })

    const users = rows.map((u) => ({
      id: u.id,
      email: u.email,
      fullName: u.fullName,
      accountStatus: u.accountStatus,
      activityStatus: u.accountStatus === "ACTIVE" ? "Active" : "Disabled",
    }))

    return NextResponse.json({ users })
  } catch (error) {
    console.error("Failed to list users:", error)
    return NextResponse.json({ error: "Failed to load users." }, { status: 500 })
  }
}
