import { createServerClient } from "@supabase/ssr"
import { parse as parseCookie, serialize as serializeCookie } from "cookie"
import { prisma } from "@/lib/prisma"

export async function POST(request: Request) {
  try {
    return await login(request)
  } catch {
    return Response.json({ error: "Login failed. Please try again." }, { status: 500 })
  }
}

async function login(request: Request) {
  const body = await request.json().catch(() => null)

  if (!body || typeof body !== "object" || Array.isArray(body)) {
    return Response.json({ error: "Invalid request body." }, { status: 400 })
  }

  const { email, password } = body

  if (typeof email !== "string" || typeof password !== "string" || !email.trim() || !password) {
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
      cookieOptions: { secure: process.env.NODE_ENV === "production", sameSite: "lax", path: "/" },
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

    if (error.status === 429 || error.code === "over_request_rate_limit" || msg.includes("rate limit") || msg.includes("too many requests")) {
      return Response.json(
        { error: "Too many login attempts. Please wait a moment and try again." },
        { status: 429 }
      )
    }

    if (error.code === "invalid_credentials" || msg.includes("invalid login") || msg.includes("invalid credentials") || msg.includes("invalid email or password")) {
      return Response.json(
        { error: "Invalid email or password." },
        { status: 401 }
      )
    }

    if (error.code === "email_not_confirmed" || msg.includes("email not confirmed")) {
      return Response.json(
        { error: "Please confirm your email address before signing in. Check your inbox." },
        { status: 403 }
      )
    }

    if (error.code === "user_banned" || msg.includes("disabled") || msg.includes("banned")) {
      return Response.json(
        { error: "Your account has been disabled. Please contact support." },
        { status: 403 }
      )
    }

    return Response.json({ error: "Login failed. Please try again." }, { status: 400 })
  }

  if (!data.user || !data.session) {
    return Response.json({ error: "Login failed. Please try again." }, { status: 500 })
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
  })

  Object.entries(responseHeaders).forEach(([key, value]) => {
    response.headers.set(key, value)
  })
  response.headers.set("Cache-Control", "private, no-store")

  cookiesToSet.forEach((cookie) => {
    response.headers.append(
      "Set-Cookie",
      serializeCookie(cookie.name, cookie.value, cookie.options)
    )
  })

  return response
}
