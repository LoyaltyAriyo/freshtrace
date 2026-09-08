import { pathToFileURL } from "node:url"
import { createClient } from "@supabase/supabase-js"
import prismaPkg from "../generated/prisma-client/index.js"
import { loadClientEnvironment } from "./load-client-environment.mjs"
import { promoteExistingAdmin, safeFailureMessage } from "./admin-promotion.mjs"

// Importing this module for offline tests never loads local credentials or runs SQL.
export async function runBootstrap() {
  let prisma
  try {
    loadClientEnvironment()
    for (const key of ["DATABASE_URL", "SUPABASE_URL", "SUPABASE_SERVICE_ROLE_KEY"]) {
      if (!process.env[key]?.trim()) {
        console.error("Admin promotion refused: required server configuration is missing.")
        return 1
      }
    }
    prisma = new prismaPkg.PrismaClient({ log: [] })
    const supabase = createClient(
      process.env.SUPABASE_URL,
      process.env.SUPABASE_SERVICE_ROLE_KEY,
      { auth: { persistSession: false, autoRefreshToken: false, detectSessionInUrl: false } },
    )
    const result = await promoteExistingAdmin({ env: process.env, prisma, admin: supabase.auth.admin })
    console.log(JSON.stringify(result))
    return 0
  } catch (error) {
    console.error(safeFailureMessage(error))
    return 1
  } finally {
    if (prisma) {
      try {
        await prisma.$disconnect()
      } catch {
        console.error("Admin promotion: database disconnect failed.")
        process.exitCode = 1
      }
    }
  }
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  process.exitCode = (await runBootstrap()) || process.exitCode || 0
}
