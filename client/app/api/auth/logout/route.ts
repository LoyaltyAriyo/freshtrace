import { createServerClient } from "@supabase/ssr"
import { parse as parseCookie, serialize as serializeCookie } from "cookie"

export async function POST(request: Request) {
  const cookieHeader = request.headers.get("cookie") ?? ""
  const existingCookies = parseCookie(cookieHeader)

  const getAllCookies = () =>
    Object.entries(existingCookies).map(([name, value]) => ({
      name,
      value: String(value),
    }))

  const cookiesToSet: {
    name: string
    value: string
    options: import("cookie").SerializeOptions
  }[] = []
  let responseHeaders: Record<string, string> = {}

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll: getAllCookies,
        setAll(cookies, headers) {
          cookiesToSet.push(...cookies)
          responseHeaders = { ...responseHeaders, ...headers }
        },
      },
    }
  )

  try {
    await supabase.auth.signOut()
  } catch {
    // Minimal handling: treat as best-effort logout.
  }

  const response = Response.json({ message: "Signed out" })

  Object.entries(responseHeaders).forEach(([key, value]) => {
    response.headers.set(key, value)
  })

  cookiesToSet.forEach((cookie) => {
    response.headers.append(
      "Set-Cookie",
      serializeCookie(cookie.name, cookie.value, cookie.options)
    )
  })

  return response
}

