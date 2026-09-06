import { config as loadEnv } from "dotenv"
import path from "node:path"
import { fileURLToPath } from "node:url"

const clientRoot = path.resolve(
  path.dirname(fileURLToPath(import.meta.url)),
  "..",
)

export function loadClientEnvironment() {
  // Exported variables win. For local files, .env.local takes precedence over
  // .env, matching the application root used by Next.js and Prisma.
  loadEnv({ path: path.join(clientRoot, ".env.local"), quiet: true })
  loadEnv({ path: path.join(clientRoot, ".env"), quiet: true })
}
