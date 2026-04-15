import { NextResponse } from "next/server"

import type { Prisma } from "@/generated/prisma-client"

import { requireAdmin } from "@/lib/auth/require-admin"
import { getAdminUserRecords } from "@/lib/queries/admin-users"

const PAGE_SIZE_DEFAULT = 20
const PAGE_SIZE_MAX = 100

type ParsedQuery =
  | { ok: true; where: Prisma.UserWhereInput; page: number; limit: number }
  | { ok: false; response: NextResponse }

function parseUserListQuery(url: URL): ParsedQuery {
  const q = url.searchParams.get("q")?.trim() ?? ""
  const statusRaw = url.searchParams.get("status")?.trim().toUpperCase() ?? ""
  const pageRaw = url.searchParams.get("page") ?? "1"
  const limitRaw = url.searchParams.get("limit") ?? String(PAGE_SIZE_DEFAULT)

  if (statusRaw && statusRaw !== "ALL" && statusRaw !== "ACTIVE" && statusRaw !== "DISABLED") {
    return {
      ok: false,
      response: NextResponse.json(
        { error: 'Invalid status. Use "all", "ACTIVE", or "DISABLED".' },
        { status: 400 },
      ),
    }
  }

  const page = parseInt(pageRaw, 10)
  const limit = parseInt(limitRaw, 10)

  if (isNaN(page) || page < 1) {
    return {
      ok: false,
      response: NextResponse.json({ error: "Invalid page. Must be a positive integer." }, { status: 400 }),
    }
  }

  if (isNaN(limit) || limit < 1 || limit > PAGE_SIZE_MAX) {
    return {
      ok: false,
      response: NextResponse.json(
        { error: `Invalid limit. Must be between 1 and ${PAGE_SIZE_MAX}.` },
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

  return { ok: true, where, page, limit }
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

  const { where, page, limit } = parsed
  const skip = (page - 1) * limit

  try {
    const { users: rows, total } = await getAdminUserRecords({
      where,
      limit,
      offset: skip,
    })

    const users = rows.map((u) => ({
      id: u.id,
      email: u.email,
      fullName: u.fullName,
      role: u.role,
      accountStatus: u.accountStatus,
      activityStatus: u.accountStatus === "ACTIVE" ? "Active" : "Disabled",
      joinedAt: u.createdAt.toISOString(),
    }))

    return NextResponse.json({
      users,
      pagination: {
        total,
        page,
        limit,
        totalPages: Math.ceil(total / limit),
      },
    })
  } catch (error) {
    console.error("Failed to list users:", error)
    return NextResponse.json({ error: "Failed to load users." }, { status: 500 })
  }
}
