import { NextResponse } from "next/server"

import { requireAdmin } from "@/lib/auth/require-admin"
import { prisma } from "@/lib/prisma"

export async function GET() {
  const auth = await requireAdmin()
  if (!auth.ok) {
    return auth.response
  }

  try {
    const rows = await prisma.user.findMany({
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
