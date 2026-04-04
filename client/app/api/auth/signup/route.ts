import { supabase } from "@/lib/supabase"
import { prisma } from "@/lib/prisma"

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

  if (password.length < 6) {
    return Response.json(
      { error: "Password must be at least 6 characters." },
      { status: 400 }
    )
  }

  const { data, error } = await supabase.auth.signUp({ email, password })

  if (error) {
    if (error.message.toLowerCase().includes("already registered")) {
      return Response.json(
        { error: "An account with this email already exists." },
        { status: 409 }
      )
    }
    return Response.json({ error: error.message }, { status: 400 })
  }

  if (!data.user) {
    return Response.json({ error: "Signup failed. Please try again." }, { status: 500 })
  }

  try {
    await prisma.user.create({
      data: {
        id: data.user.id,
        email: data.user.email!,
        fullName,
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
