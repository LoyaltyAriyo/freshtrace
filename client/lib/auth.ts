import { createServerClient } from "@supabase/ssr"
import { parse as parseCookie } from "cookie"

import { logError } from "@/lib/logger"

/**
 * Resolve the current authenticated Supabase user id for API routes.
 *
 * This helper is intentionally minimal:
 * - It reads cookies from the incoming Request header.
 * - Proxy refreshes and forwards session cookies before these APIs run.
 * - This read-only client verifies the forwarded session with Supabase.
 * - It returns null when the user cannot be resolved instead of throwing.
 */
export async function getCurrentUserId(request: Request): Promise<string | null> {
  const cookieHeader = request.headers.get("cookie") ?? ""
  const existingCookies = parseCookie(cookieHeader)

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return Object.entries(existingCookies).map(([name, value]) => ({
            name,
            value: String(value),
          }))
        },
        // Proxy owns refresh cookies on both the request and response.
        setAll() {
          // no-op
        },
      },
    }
  )

  try {
    const {
      data: { user },
    } = await supabase.auth.getUser()

    return user?.id ?? null
  } catch (error) {
    await logError({
      message: "Failed to resolve current Supabase user in API route.",
      error,
      errorType: "AUTH_USER_RESOLUTION_FAILED",
      source: "AUTH",
      details: {
        hasCookieHeader: cookieHeader.length > 0,
      },
    })
    return null
  }
}
