import prismaPkg from "../generated/prisma-client/index.js"

import { loadClientEnvironment } from "./load-client-environment.mjs"

loadClientEnvironment()

const { PrismaClient } = prismaPkg

const prisma = new PrismaClient()

async function main() {
  console.log("FreshTrace inventory cleanup starting...")
  console.log(
    "This script deletes inventory/test data from Receipt-related tables but preserves all users and auth accounts.",
  )

  const allowFlag = process.env.FRESHTRACE_ALLOW_INVENTORY_CLEANUP

  if (allowFlag !== "true") {
    console.error(
      "Refusing to delete data. Set FRESHTRACE_ALLOW_INVENTORY_CLEANUP=true when running this script to confirm.",
    )
    console.error(
      'Example: FRESHTRACE_ALLOW_INVENTORY_CLEANUP=true npm run cleanup:inventory',
    )
    process.exit(1)
  }

  try {
    const usedBefore = await prisma.usedItem.count()
    const wastedBefore = await prisma.wastedItem.count()
    const draftsBefore = await prisma.receiptItemDraft.count()
    const foodBefore = await prisma.foodItem.count()
    const receiptsBefore = await prisma.receipt.count()

    console.log("Current inventory row counts (before cleanup):")
    console.log(`- UsedItem: ${usedBefore}`)
    console.log(`- WastedItem: ${wastedBefore}`)
    console.log(`- ReceiptItemDraft: ${draftsBefore}`)
    console.log(`- FoodItem: ${foodBefore}`)
    console.log(`- Receipt: ${receiptsBefore}`)

    console.log("Deleting inventory/test data in dependency-safe order...")

    const usedDeleted = await prisma.usedItem.deleteMany({})
    console.log(`Deleted ${usedDeleted.count} UsedItem row(s).`)

    const wastedDeleted = await prisma.wastedItem.deleteMany({})
    console.log(`Deleted ${wastedDeleted.count} WastedItem row(s).`)

    const draftsDeleted = await prisma.receiptItemDraft.deleteMany({})
    console.log(`Deleted ${draftsDeleted.count} ReceiptItemDraft row(s).`)

    const foodDeleted = await prisma.foodItem.deleteMany({})
    console.log(`Deleted ${foodDeleted.count} FoodItem row(s).`)

    const receiptsDeleted = await prisma.receipt.deleteMany({})
    console.log(`Deleted ${receiptsDeleted.count} Receipt row(s).`)

    console.log("Inventory cleanup complete. User and auth data were not touched.")
  } catch (error) {
    console.error(
      `Inventory cleanup failed with unexpected error: ${
        error?.message ?? String(error)
      }`,
    )
    process.exit(1)
  } finally {
    await prisma.$disconnect()
  }
}

main()
