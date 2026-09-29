import { createServerClient } from "@supabase/ssr"
import { NextResponse, type NextRequest } from "next/server"

const PUBLIC_ROUTES = ["/login", "/signup"]
const SESSION_HEADERS = ["cache-control", "expires", "pragma"]

function copySession(source: NextResponse, target: NextResponse) {
  source.cookies.getAll().forEach((cookie) => target.cookies.set(cookie))
  for (const name of SESSION_HEADERS) {
    const value = source.headers.get(name)
    if (value) target.headers.set(name, value)
  }
  return target
}

export async function proxy(request: NextRequest) {
  let response = NextResponse.next({ request })

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookieOptions: { secure: process.env.NODE_ENV === "production", sameSite: "lax", path: "/" },
      cookies: {
        getAll() {
          return request.cookies.getAll()
        },
        setAll(cookiesToSet, headers) {
          // Forward refreshed tokens to this request's handlers/components as
          // well as the browser, so downstream clients do not refresh twice.
          cookiesToSet.forEach(({ name, value }) => request.cookies.set(name, value))
          response = copySession(response, NextResponse.next({ request }))
          cookiesToSet.forEach(({ name, value, options }) => {
            response.cookies.set(name, value, options)
          })
          Object.entries(headers ?? {}).forEach(([name, value]) => response.headers.set(name, value))
          response.headers.set("Cache-Control", "private, no-store")
        },
      },
    }
  )

  const { data: { user } } = await supabase.auth.getUser()

  const pathname = request.nextUrl.pathname
  // API handlers own authorization and JSON errors; proxy only refreshes their
  // sessions. Auth endpoints and the secret-authenticated cron bypass proxy.
  if (pathname === "/api" || pathname.startsWith("/api/")) return response
  const isPublicRoute = PUBLIC_ROUTES.includes(pathname)

  if (!user && !isPublicRoute) {
    const loginUrl = request.nextUrl.clone()
    loginUrl.pathname = "/login"
    return copySession(response, NextResponse.redirect(loginUrl))
  }

  if (user && isPublicRoute) {
    const homeUrl = request.nextUrl.clone()
    homeUrl.pathname = "/"
    return copySession(response, NextResponse.redirect(homeUrl))
  }

  return response
}

export const config = {
  // Public branding must load before login. Keep exclusions narrowly scoped so
  // unrelated paths (including unknown pages) retain their existing auth gate.
  matcher: ["/((?!api/auth/(?:login|signup|logout)(?:/|$)|api/cron/keepalive(?:/|$)|_next/static|_next/image|favicon.ico|brand/|manifest\\.webmanifest$).*)"],
}
