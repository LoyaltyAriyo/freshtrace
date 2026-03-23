import { prisma } from "@/lib/prisma"

export async function GET() {
  try {
    const categories = await prisma.category.findMany({
      select: {
        id: true,
        name: true,
        shelfLifeDays: true,
      },
      orderBy: { name: "asc" },
    })

    return Response.json(categories)
  } catch (error) {
    console.error("Failed to fetch categories:", error)
    return Response.json(
      { error: "Failed to load categories. Please try again." },
      { status: 500 }
    )
  }
}
