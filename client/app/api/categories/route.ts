import { prisma } from "@/lib/prisma"
import { ensureCategories } from "@/lib/category-utils"

export async function GET() {
  try {
    const categories = await ensureCategories(prisma.category)

    return Response.json(categories)
  } catch (error) {
    console.error("Failed to fetch categories:", error)
    return Response.json(
      { error: "Failed to load categories. Please try again." },
      { status: 500 }
    )
  }
}
