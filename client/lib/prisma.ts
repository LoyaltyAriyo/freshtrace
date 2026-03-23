import { PrismaClient } from "@prisma/client"
import path from "path"

const localDbUrl = `file:${path
  .resolve(process.cwd(), "../server/prisma/dev.db")
  .replace(/\\/g, "/")}`

const dbUrl = process.env.NODE_ENV === "production"
  ? process.env.DATABASE_URL || localDbUrl
  : localDbUrl

const globalForPrisma = globalThis as unknown as {
  prisma: PrismaClient | undefined
}

export const prisma =
  globalForPrisma.prisma ??
  new PrismaClient({
    log: ["error"],
    datasources: {
      db: {
        url: dbUrl,
      },
    },
  })

if (process.env.NODE_ENV !== "production") {
  globalForPrisma.prisma = prisma
}