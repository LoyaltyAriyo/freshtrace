import { PrismaClient } from "@prisma/client"

const prisma = new PrismaClient()

async function main() {
  const categories = [
    { name: "Produce", shelfLifeDays: 7 },
    { name: "Dairy", shelfLifeDays: 10 },
    { name: "Meat", shelfLifeDays: 5 },
    { name: "Seafood", shelfLifeDays: 3 },
    { name: "Bakery", shelfLifeDays: 5 },
    { name: "Frozen", shelfLifeDays: 90 },
    { name: "Pantry", shelfLifeDays: 60 },
    { name: "Beverage", shelfLifeDays: 30 },
    { name: "Snacks", shelfLifeDays: 45 },
    { name: "Other", shelfLifeDays: 14 },
  ]

  for (const category of categories) {
    await prisma.category.upsert({
      where: { name: category.name },
      update: { shelfLifeDays: category.shelfLifeDays },
      create: category,
    })
  }
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