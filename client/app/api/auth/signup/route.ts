import { randomUUID } from "node:crypto"
import { createClient, type AuthError } from "@supabase/supabase-js"
import { prisma } from "@/lib/prisma"

export const runtime = "nodejs"

const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
const UUID_REGEX = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i
const INTERNAL_ERROR = "Unable to create your account. Please try again or contact support."
const EXISTING_ACCOUNT = "An account with this email already exists. Please sign in."

function failure(error: string, status: number) {
  return Response.json({ error }, { status, headers: { "Cache-Control": "private, no-store" } })
}

function authFailure(error: AuthError) {
  const code = error.code
  if (code === "user_already_exists" || code === "email_exists") {
    return failure(EXISTING_ACCOUNT, 409)
  }
  if (error.status === 429 || code === "over_request_rate_limit" || code === "over_email_send_rate_limit") {
    return failure("Too many signup attempts. Please wait a moment and try again.", 429)
  }
  if (code === "email_address_invalid" || code === "email_address_not_authorized") {
    return failure("Please enter a valid email address.", 400)
  }
  if (code === "weak_password" || code === "validation_failed") {
    return failure("Please check your email and password requirements and try again.", 400)
  }
  // Provider messages can contain implementation details or submitted values.
  return failure(INTERNAL_ERROR, error.status && error.status < 500 ? 400 : 500)
}

export async function POST(request: Request) {
  const body: unknown = await request.json().catch(() => null)
  if (!body || typeof body !== "object" || Array.isArray(body)) {
    return failure("Invalid request body.", 400)
  }
  const { email, password, fullName } = body as Record<string, unknown>
  if (typeof email !== "string" || typeof password !== "string" || typeof fullName !== "string") {
    return failure("Email, password, and full name are required.", 400)
  }
  const normalizedEmail = email.trim().toLowerCase()
  const normalizedName = fullName.trim()
  if (normalizedEmail.length > 254 || !EMAIL_REGEX.test(normalizedEmail)) {
    return failure("Please enter a valid email address.", 400)
  }
  if (normalizedName.length < 2 || normalizedName.length > 200) {
    return failure("Full name must be between 2 and 200 characters.", 400)
  }
  if (password.length < 6 || password.length > 128) {
    return failure("Password must be between 6 and 128 characters.", 400)
  }

  try {
    const signupAttemptId = randomUUID()
    // A request-local public-key client: no privileged signup and no persisted session.
    const supabase = createClient(process.env.SUPABASE_URL!, process.env.SUPABASE_ANON_KEY!, {
      auth: { persistSession: false, autoRefreshToken: false, detectSessionInUrl: false },
    })
    const { data, error } = await supabase.auth.signUp({
      email: normalizedEmail,
      password,
      options: { data: { signup_attempt_id: signupAttemptId } },
    })
    if (error) return authFailure(error)
    const user = data.user
    if (!user || !UUID_REGEX.test(user.id) || user.email?.toLowerCase() !== normalizedEmail) {
      return failure(INTERNAL_ERROR, 500)
    }

    // Supabase can return an obfuscated duplicate (empty identities), or an existing
    // unconfirmed user (whose metadata is NOT updated by signUp). Neither may be
    // linked or deleted here. A fresh server nonce plus a real email identity proves
    // this request created the identity. Metadata is never used for authorization.
    if (!user.identities?.some((identity) => identity.provider === "email" && identity.user_id === user.id)
      || user.user_metadata?.signup_attempt_id !== signupAttemptId) {
      return failure(EXISTING_ACCOUNT, 409)
    }

    try {
      await prisma.user.create({
        data: { id: user.id, email: normalizedEmail, fullName: normalizedName },
      })
    } catch {
      try {
        // Load the service-role client only for compensation of this new identity.
        const { supabaseAdmin } = await import("@/lib/supabase/server")
        const { error: deletionError } = await supabaseAdmin.auth.admin.deleteUser(user.id)
        if (deletionError) throw new Error("Signup compensation failed")
      } catch {
        // Structured operational log, deliberately excluding provider/Prisma errors,
        // email, credentials, and session data. IDs allow authorized reconciliation.
        console.error({
          severity: "CRITICAL",
          event: "SIGNUP_COMPENSATION_FAILED",
          message: "New Auth identity could not be removed after profile creation failed. Manual reconciliation required.",
          authUserId: user.id,
          signupAttemptId,
        })
      }
      return failure(INTERNAL_ERROR, 500)
    }

    return Response.json({
      message: "Account created successfully.",
      confirmationRequired: !data.session,
    }, { status: 201, headers: { "Cache-Control": "private, no-store" } })
  } catch {
    console.error({ severity: "ERROR", event: "SIGNUP_FAILED", message: "Signup could not be completed." })
    return failure(INTERNAL_ERROR, 500)
  }
}
