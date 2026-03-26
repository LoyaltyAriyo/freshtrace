import { NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"

type RouteContext = {
  params: Promise<{ id: string }>
}

export async function GET(_: Request, context: RouteContext) {
  try {
    const { id } = await context.params

    const item = await prisma.foodItem.findUnique({
      where: { id },
      include: {
        category: true,
      },
    })

    if (!item) {
      return NextResponse.json({ error: "Item not found." }, { status: 404 })
    }

    return NextResponse.json(item)
  } catch (error) {
    console.error("Failed to load item:", error)
    return NextResponse.json({ error: "Failed to load item." }, { status: 500 })
  }
}

export async function PATCH(request: Request, context: RouteContext) {
  try {
    const { id } = await context.params
    const body = await request.json()

    const updated = await prisma.foodItem.update({
      where: { id },
      data: {
        name: body.name,
        quantity: body.quantity,
        categoryId: body.categoryId,
      },
      include: {
        category: true,
      },
    })

    return NextResponse.json(updated)
  } catch (error) {
    console.error("Failed to update item:", error)
    return NextResponse.json({ error: "Failed to update item." }, { status: 500 })
  }
}