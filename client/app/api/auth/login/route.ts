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
    if (
      error.message.toLowerCase().includes("invalid login") ||
      error.message.toLowerCase().includes("invalid credentials")
    ) {
      return Response.json(
        { error: "Invalid email or password." },
        { status: 401 }
      )
    }
    return Response.json({ error: error.message }, { status: 400 })
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
