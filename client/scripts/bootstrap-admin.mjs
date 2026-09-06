import { createClient } from "@supabase/supabase-js"
import prismaPkg from "../generated/prisma-client/index.js"

import { loadClientEnvironment } from "./load-client-environment.mjs"

loadClientEnvironment()

const { PrismaClient, UserRole, AccountStatus } = prismaPkg

const prisma = new PrismaClient()

async function main() {
  console.log("Starting FreshTrace admin bootstrap...")

  const requiredEnvVars = [
    "DATABASE_URL",
    "ADMIN_EMAIL",
    "ADMIN_PASSWORD",
    "ADMIN_FULL_NAME",
    "SUPABASE_URL",
    "SUPABASE_SERVICE_ROLE_KEY",
  ]

  const missingEnvVars = requiredEnvVars.filter((name) => !process.env[name])

  if (missingEnvVars.length > 0) {
    console.error(
      `Missing required environment variables: ${missingEnvVars.join(", ")}`,
    )
    console.error(
      "Set these environment variables (for example via your shell or an .env file) and try again.",
    )
    process.exit(1)
  }

  const adminEmail = process.env.ADMIN_EMAIL
  const adminPassword = process.env.ADMIN_PASSWORD
  const adminFullName = process.env.ADMIN_FULL_NAME
  const supabaseUrl = process.env.SUPABASE_URL
  const supabaseServiceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY

  console.log("Environment validation passed.")

  const supabaseAdmin = createClient(supabaseUrl, supabaseServiceRoleKey, {
    auth: {
      persistSession: false,
    },
  })

  console.log("Looking up Supabase Auth user for admin email...")

  let authUser = null

  // Try to locate an existing user by email first to keep the script idempotent.
  const { data: listData, error: listError } =
    await supabaseAdmin.auth.admin.listUsers({
      page: 1,
      perPage: 1000,
    })

  if (listError) {
    console.warn(
      `Warning: failed to list Supabase users: ${
        listError.message ?? String(listError)
      }`,
    )
    if (typeof listError.status === "number") {
      if (listError.status === 401 || listError.status === 403) {
        console.error(
          "Supabase service role key appears to be missing or invalid. Check SUPABASE_SERVICE_ROLE_KEY.",
        )
      }
    }
  } else if (listData?.users?.length) {
    authUser = listData.users.find(
      (user) =>
        user.email &&
        user.email.toLowerCase() === adminEmail.toLowerCase(),
    )

    if (authUser) {
      console.log(
        `Found existing Supabase Auth user for admin email with id: ${authUser.id}`,
      )
    }
  }

  if (!authUser) {
    console.log(
      "No existing Supabase Auth user found for admin email. Creating a new one...",
    )

    const { data: createData, error: createError } =
      await supabaseAdmin.auth.admin.createUser({
        email: adminEmail,
        password: adminPassword,
        email_confirm: true,
      })

    if (createError) {
      const message = createError.message ?? String(createError)

      // Handle the case where the user already exists but listUsers did not return them.
      if (message.toLowerCase().includes("already") && message.toLowerCase().includes("register")) {
        console.log(
          "Supabase reports the admin user is already registered. Attempting to locate the existing user by email...",
        )

        const { data: listAfterCreate, error: listAfterError } =
          await supabaseAdmin.auth.admin.listUsers({
            page: 1,
            perPage: 1000,
          })

        if (listAfterError) {
          console.error(
            `Failed to list Supabase users after duplicate-user error: ${
              listAfterError.message ?? String(listAfterError)
            }`,
          )
          process.exit(1)
        }

        authUser =
          listAfterCreate?.users?.find(
            (user) =>
              user.email &&
              user.email.toLowerCase() === adminEmail.toLowerCase(),
          ) ?? null

        if (!authUser) {
          console.error(
            "Supabase reported that the admin user already exists, but the user could not be located by email.",
          )
          process.exit(1)
        }

        console.log(
          `Found existing Supabase Auth admin user after duplicate-user error with id: ${authUser.id}`,
        )
      } else {
        console.error(
          `Failed to create Supabase Auth admin user: ${message}`,
        )
        process.exit(1)
      }
    } else {
      authUser = createData?.user ?? null

      if (!authUser) {
        console.error(
          "Supabase Auth admin.createUser returned no user in the response.",
        )
        process.exit(1)
      }

      console.log(
        `Created new Supabase Auth admin user with id: ${authUser.id}`,
      )
    }
  }

  if (!authUser || !authUser.id) {
    console.error(
      "Supabase Auth admin user could not be resolved or has no id.",
    )
    process.exit(1)
  }

  console.log(`Using Supabase Auth user id: ${authUser.id}`)

  console.log("Ensuring matching Prisma User row exists...")

  // Check for an existing Prisma user by email first to detect mismatched IDs.
  let prismaUserByEmail = null
  try {
    prismaUserByEmail = await prisma.user.findUnique({
      where: { email: adminEmail },
    })
  } catch (error) {
    console.error(
      `Failed to query Prisma User by email: ${error.message ?? String(error)}`,
    )
    process.exit(1)
  }

  if (prismaUserByEmail && prismaUserByEmail.id !== authUser.id) {
    console.error("Detected mismatched IDs for admin user:")
    console.error(`- Supabase Auth user id: ${authUser.id}`)
    console.error(`- Prisma User id for same email: ${prismaUserByEmail.id}`)
    console.error(
      "Refusing to continue to avoid creating conflicting user records. Please resolve this mismatch manually and rerun the script.",
    )
    process.exit(1)
  }

  try {
    const user = await prisma.user.upsert({
      where: { id: authUser.id },
      update: {
        email: adminEmail,
        fullName: adminFullName,
        role: UserRole ? UserRole.ADMIN : "ADMIN",
        accountStatus: AccountStatus ? AccountStatus.ACTIVE : "ACTIVE",
      },
      create: {
        id: authUser.id,
        email: adminEmail,
        fullName: adminFullName,
        role: UserRole ? UserRole.ADMIN : "ADMIN",
        accountStatus: AccountStatus ? AccountStatus.ACTIVE : "ACTIVE",
      },
    })

    if (prismaUserByEmail) {
      console.log(
        `Updated existing Prisma User record for admin (id: ${user.id}).`,
      )
    } else if (user) {
      console.log(
        `Created new Prisma User record for admin (id: ${user.id}).`,
      )
    }

    console.log(
      `Prisma User state: role=${user.role}, accountStatus=${user.accountStatus}`,
    )
  } catch (error) {
    console.error(
      `Failed to create or update Prisma User record for admin: ${
        error.message ?? String(error)
      }`,
    )
    process.exit(1)
  }

  console.log("Admin bootstrap complete.")
}

main()
  .then(async () => {
    await prisma.$disconnect()
  })
  .catch(async (error) => {
    console.error(
      `Admin bootstrap failed with unexpected error: ${
        error?.message ?? String(error)
      }`,
    )
    await prisma.$disconnect()
    process.exit(1)
  })
