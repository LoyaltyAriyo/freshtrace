import { PrismaClient } from "../generated/client"
import { DEFAULT_CATEGORIES } from "../../client/lib/category-utils"

const prisma = new PrismaClient()

async function main() {
  for (const category of DEFAULT_CATEGORIES) {
    await prisma.category.upsert({
      where: { name: category.name },
      update: { shelfLifeDays: category.shelfLifeDays },
      create: category,
    })
    console.log(`Seeded category: ${category.name}`)
  }
  console.log(`Done — seeded ${DEFAULT_CATEGORIES.length} categories.`)
}

main()
  .then(async () => {
    await prisma.$disconnect()
  })
  .catch(async (error) => {
    console.error(error)
    await prisma.$disconnect()
    process.exit(1)
  })
