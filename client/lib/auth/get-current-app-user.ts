import { createServerClient } from "@supabase/ssr"
import { cookies } from "next/headers"

import { prisma } from "@/lib/prisma"

export async function getCurrentAppUser() {
  const cookieStore = await cookies()

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return cookieStore.getAll()
        },
        setAll() {
          // Server Components cannot write cookies. Proxy refreshes the session
          // and forwards its cookies before this component is rendered.
        },
      },
    },
  )

  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) {
    return null
  }

  return prisma.user.findUnique({
    where: { id: user.id },
    select: {
      id: true,
      email: true,
      fullName: true,
      role: true,
      accountStatus: true,
    },
  })
}
