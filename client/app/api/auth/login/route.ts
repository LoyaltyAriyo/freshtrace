import { supabase } from "@/lib/supabase"

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

  const { data, error } = await supabase.auth.signInWithPassword({ email, password })

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

  return Response.json({
    user: {
      id: data.user.id,
      email: data.user.email,
    },
    session: {
      accessToken: data.session.access_token,
      expiresAt: data.session.expires_at,
    },
  })
}
