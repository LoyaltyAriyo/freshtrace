import { config as loadEnv } from "dotenv"
import path from "node:path"
import { fileURLToPath } from "node:url"
import { defineConfig } from "prisma/config"

const clientRoot = path.dirname(fileURLToPath(import.meta.url))
const prismaRoot = path.join(clientRoot, "prisma")

// Match the application's local environment precedence while keeping exported
// shell variables authoritative. Absolute paths make the config independent of
// the shell directory from which Prisma is invoked.
loadEnv({ path: path.join(clientRoot, ".env.local"), quiet: true })
loadEnv({ path: path.join(clientRoot, ".env"), quiet: true })

export default defineConfig({
  schema: path.join(prismaRoot, "schema.prisma"),
  migrations: {
    path: path.join(prismaRoot, "migrations"),
    // Prisma splits this command on spaces without shell-quote parsing. Both
    // documented npm entrypoints run it from client/, so keep the path relative.
    seed: "tsx prisma/seed.ts",
  },
})
