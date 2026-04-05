import { createServerClient } from "@supabase/ssr"
import { parse as parseCookie, serialize as serializeCookie } from "cookie"
import { prisma } from "@/lib/prisma"

export async function POST(request: Request) {
  const body = await request.json().catch(() => null)

  if (!body) {
    return Response.json({ error: "Invalid request body." }, { status: 400 })
  }

  const { email, password } = body

  if (!email || !password) {
    return Response.json(
      { error: "Email and password are required." },
      { status: 400 }
    )
  }

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

  const { data, error } = await supabase.auth.signInWithPassword({
    email,
    password,
  })

  if (error) {
    const msg = error.message.toLowerCase()

    if (msg.includes("invalid login") || msg.includes("invalid credentials") || msg.includes("invalid email or password")) {
      return Response.json(
        { error: "Invalid email or password." },
        { status: 401 }
      )
    }

    if (msg.includes("email not confirmed")) {
      return Response.json(
        { error: "Please confirm your email address before signing in. Check your inbox." },
        { status: 403 }
      )
    }

    if (msg.includes("disabled") || msg.includes("banned")) {
      return Response.json(
        { error: "Your account has been disabled. Please contact support." },
        { status: 403 }
      )
    }

    if (msg.includes("rate limit") || msg.includes("too many requests")) {
      return Response.json(
        { error: "Too many login attempts. Please wait a moment and try again." },
        { status: 429 }
      )
    }

    return Response.json({ error: "Login failed. Please try again." }, { status: 400 })
  }

  let appUser: { role: string | null } | null = null
  try {
    appUser = await prisma.user.findUnique({
      where: { id: data.user.id },
      select: { role: true },
    })
  } catch {
    // If this fails, we still return a successful login response without role information.
  }

  const response = Response.json({
    user: {
      id: data.user.id,
      email: data.user.email,
      role: appUser?.role ?? null,
    },
    session: {
      accessToken: data.session.access_token,
      expiresAt: data.session.expires_at,
    },
  })

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
