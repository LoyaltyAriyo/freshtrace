import { NextResponse } from "next/server"

import { requireAdmin } from "@/lib/auth/require-admin"
import { prisma } from "@/lib/prisma"

type RouteContext = {
  params: Promise<{ id: string }>
}

export async function GET(request: Request, context: RouteContext) {
  const auth = await requireAdmin()
  if (!auth.ok) {
    return auth.response
  }

  const { id } = await context.params
  if (!id || typeof id !== "string") {
    return NextResponse.json({ error: "User ID is required." }, { status: 400 })
  }

  try {
    const user = await prisma.user.findUnique({
      where: { id },
      select: {
        id: true,
        email: true,
        fullName: true,
        accountStatus: true,
      },
    })

    if (!user) {
      return NextResponse.json({ error: "User not found." }, { status: 404 })
    }

    return NextResponse.json({
      user: {
        ...user,
        activityStatus: user.accountStatus === "ACTIVE" ? "Active" : "Disabled",
      },
    })
  } catch (error) {
    console.error("Failed to load user:", error)
    return NextResponse.json({ error: "Failed to load user." }, { status: 500 })
  }
}

