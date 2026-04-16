import { prisma } from "@/lib/prisma"
import { ensureCategories } from "@/lib/category-utils"
import { logError } from "@/lib/logger"

export async function GET() {
  try {
    const categories = await ensureCategories(prisma.category)

    return Response.json(categories)
  } catch (error) {
    await logError({
      message: "Failed to fetch categories.",
      error,
      errorType: "CATEGORIES_FETCH_FAILED",
      source: "DB",
      details: { route: "GET /api/categories" },
    })
    return Response.json(
      { error: "Failed to load categories. Please try again." },
      { status: 500 }
    )
  }
}
