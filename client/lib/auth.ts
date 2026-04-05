import { createServerClient } from "@supabase/ssr"
import { parse as parseCookie } from "cookie"

/**
 * Resolve the current authenticated Supabase user id for API routes.
 *
 * This helper is intentionally minimal:
 * - It reads cookies from the incoming Request header.
 * - It does not attempt to write or refresh cookies (setAll is a no-op).
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
        // Inventory APIs do not need to modify auth cookies; treat setAll as a no-op.
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
    console.error("Failed to resolve current Supabase user in API route:", error)
    return null
  }
}
