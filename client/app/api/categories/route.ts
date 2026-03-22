import { prisma } from "@/lib/prisma"

export async function GET() {
  const categories = await prisma.category.findMany({
    select: {
      id: true,
      name: true,
    },
    orderBy: { name: "asc" },
  })

  return Response.json(categories)
}
