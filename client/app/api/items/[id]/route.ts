import { NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"
import { Prisma } from "@prisma/client"

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
  let body: unknown
  try {
    const { id } = await context.params
    if (!id) {
      return NextResponse.json({ error: "Item ID is required." }, { status: 400 })
    }

    try {
      body = await request.json()
    } catch {
      return NextResponse.json({ error: "Invalid JSON body." }, { status: 400 })
    }

    const { name, quantity, categoryId } = body as Record<string, unknown>

    if (!name || typeof name !== "string" || !name.trim()) {
      return NextResponse.json({ error: "Item name is required." }, { status: 400 })
    }

    if (!categoryId || typeof categoryId !== "string") {
      return NextResponse.json({ error: "Category is required." }, { status: 400 })
    }

    const parsedQuantity = Number(quantity)
    if (!Number.isInteger(parsedQuantity) || parsedQuantity < 1) {
      return NextResponse.json(
        { error: "Quantity must be a whole number of at least 1." },
        { status: 400 }
      )
    }

    const existing = await prisma.foodItem.findUnique({
      where: { id },
      select: { id: true },
    })

    if (!existing) {
      return NextResponse.json({ error: "Item not found." }, { status: 404 })
    }

    const category = await prisma.category.findUnique({
      where: { id: categoryId },
      select: { id: true },
    })

    if (!category) {
      return NextResponse.json({ error: "Selected category does not exist." }, { status: 422 })
    }

    const updated = await prisma.foodItem.update({
      where: { id },
      data: {
        name: name.trim(),
        quantity: parsedQuantity,
        categoryId,
      },
      include: {
        category: true,
      },
    })

    return NextResponse.json(updated)
  } catch (error) {
    if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === "P2025") {
      return NextResponse.json({ error: "Item not found." }, { status: 404 })
    }

    console.error("Failed to update item:", error)
    return NextResponse.json({ error: "Failed to update item." }, { status: 500 })
  }
}
