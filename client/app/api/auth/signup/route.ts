import { supabase } from "@/lib/supabase"
import { prisma } from "@/lib/prisma"

const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/

export async function POST(request: Request) {
  const body = await request.json().catch(() => null)

  if (!body) {
    return Response.json({ error: "Invalid request body." }, { status: 400 })
  }

  const { email, password, fullName } = body

  if (!email || !password || !fullName) {
    return Response.json(
      { error: "Email, password, and full name are required." },
      { status: 400 }
    )
  }

  if (!EMAIL_REGEX.test(email)) {
    return Response.json(
      { error: "Please enter a valid email address." },
      { status: 400 }
    )
  }

  if (typeof fullName !== "string" || fullName.trim().length < 2) {
    return Response.json(
      { error: "Full name must be at least 2 characters." },
      { status: 400 }
    )
  }

  if (password.length < 6) {
    return Response.json(
      { error: "Password must be at least 6 characters." },
      { status: 400 }
    )
  }

  const { data, error } = await supabase.auth.signUp({ email, password })

  if (error) {
    const msg = error.message.toLowerCase()

    if (msg.includes("already registered") || msg.includes("user already exists")) {
      return Response.json(
        { error: "An account with this email already exists." },
        { status: 409 }
      )
    }

    if (msg.includes("rate limit") || msg.includes("too many requests")) {
      return Response.json(
        { error: "Too many signup attempts. Please wait a moment and try again." },
        { status: 429 }
      )
    }

    if (msg.includes("invalid email")) {
      return Response.json(
        { error: "Please enter a valid email address." },
        { status: 400 }
      )
    }

    return Response.json({ error: "Signup failed. Please try again." }, { status: 400 })
  }

  if (!data.user) {
    return Response.json({ error: "Signup failed. Please try again." }, { status: 500 })
  }

  try {
    await prisma.user.create({
      data: {
        id: data.user.id,
        email: data.user.email!,
        fullName: fullName.trim(),
      },
    })
  } catch {
    return Response.json(
      { error: "Account created but failed to save profile. Please contact support." },
      { status: 500 }
    )
  }

  return Response.json(
    { message: "Account created successfully. Please check your email to confirm." },
    { status: 201 }
  )
}
