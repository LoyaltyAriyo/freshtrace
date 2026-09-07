"use client"

import { useRef, useState } from "react"
import { useRouter } from "next/navigation"
import Link from "next/link"
import { Eye, EyeOff } from "lucide-react"

export default function SignupPage() {
  const router = useRouter()
  const [name, setName] = useState("")
  const [email, setEmail] = useState("")
  const [password, setPassword] = useState("")
  const [confirm, setConfirm] = useState("")
  const [showPassword, setShowPassword] = useState(false)
  const [showConfirmPassword, setShowConfirmPassword] = useState(false)
  const [error, setError] = useState("")
  const [loading, setLoading] = useState(false)
  const [success, setSuccess] = useState("")
  const inFlight = useRef(false)
  const accountCreated = useRef(false)

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (inFlight.current || accountCreated.current) return
    if (!name || !email || !password || !confirm) {
      setError("Please fill in all fields.")
      return
    }
    if (password !== confirm) {
      setError("Passwords do not match.")
      return
    }
    inFlight.current = true
    setLoading(true)
    setError("")
    try {
      const response = await fetch("/api/auth/signup", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          email,
          password,
          fullName: name,
        }),
      })

      const data = await response.json().catch(() => null)

      if (!response.ok) {
        const apiError =
          (data && (data.error || data.message)) ?? null
        setError(
          typeof apiError === "string"
            ? apiError
            : "Something went wrong"
        )
        return
      }

      if (typeof data?.confirmationRequired !== "boolean") {
        setError("Unable to confirm account creation. Please try signing in or contact support.")
        return
      }
      accountCreated.current = true
      setPassword("")
      setConfirm("")
      if (data.confirmationRequired) {
        setSuccess("Account created. Check your email to confirm your account, then return here to sign in.")
        return
      }
      setSuccess("Account created. Signing you in...")

      // Only attempt automatic sign-in when Supabase did not require confirmation.
      const loginResponse = await fetch("/api/auth/login", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ email, password }),
      })

      const loginData = await loginResponse.json().catch(() => null)

      if (!loginResponse.ok) {
        setSuccess("Account created. Please sign in to continue.")
        const apiError =
          (loginData && (loginData.error || loginData.message)) ?? null
        setError(
          typeof apiError === "string"
            ? apiError
            : "Account created, but automatic sign-in failed. Please log in."
        )
        router.push("/login")
        return
      }

      const role = loginData?.user?.role

      if (role === "ADMIN") {
        router.push("/admin")
      } else {
        router.push("/")
      }
    } catch {
      if (accountCreated.current) setSuccess("Account created. Please sign in to continue.")
      setError("Unable to complete the request. Please try again or sign in if your account was created.")
    } finally {
      inFlight.current = false
      setLoading(false)
    }
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-background px-4">
      <div className="w-full max-w-sm">
        <div className="mb-8 text-center">
          <h1 className="text-2xl font-semibold tracking-tight">Create an account</h1>
          <p className="mt-1 text-sm text-muted-foreground">Start tracking your food with Fresh Trace</p>
        </div>

        <form onSubmit={handleSubmit} aria-label="Create an account" aria-busy={loading} className="flex flex-col gap-4">
          {success && (
            <div role="status" className="rounded-md bg-primary/10 px-4 py-3 text-sm">
              {success}
            </div>
          )}
          {error && (
            <div role="alert" className="rounded-md bg-destructive/10 px-4 py-3 text-sm text-destructive">
              {error}
            </div>
          )}

          <div className="flex flex-col gap-1">
            <label htmlFor="name" className="text-sm font-medium">Full Name</label>
            <input
              id="name"
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="John Doe"
              className="rounded-md border px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-primary"
              disabled={loading}
            />
          </div>

          <div className="flex flex-col gap-1">
            <label htmlFor="email" className="text-sm font-medium">Email</label>
            <input
              id="email"
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="you@example.com"
              className="rounded-md border px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-primary"
              disabled={loading}
            />
          </div>

          <div className="flex flex-col gap-1">
            <label htmlFor="password" className="text-sm font-medium">Password</label>
            <div className="relative">
              <input
                id="password"
                type={showPassword ? "text" : "password"}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="••••••••"
                className="w-full rounded-md border px-3 py-2 pr-10 text-sm outline-none focus:ring-2 focus:ring-primary"
                disabled={loading}
              />
              <button
                type="button"
                aria-label={showPassword ? "Hide password" : "Show password"}
                onClick={() => setShowPassword((current) => !current)}
                className="absolute inset-y-0 right-0 flex items-center px-3 text-muted-foreground transition-colors hover:text-foreground"
                disabled={loading}
              >
                {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
              </button>
            </div>
          </div>

          <div className="flex flex-col gap-1">
            <label htmlFor="confirm" className="text-sm font-medium">Confirm Password</label>
            <div className="relative">
              <input
                id="confirm"
                type={showConfirmPassword ? "text" : "password"}
                value={confirm}
                onChange={(e) => setConfirm(e.target.value)}
                placeholder="••••••••"
                className="w-full rounded-md border px-3 py-2 pr-10 text-sm outline-none focus:ring-2 focus:ring-primary"
                disabled={loading}
              />
              <button
                type="button"
                aria-label={showConfirmPassword ? "Hide confirm password" : "Show confirm password"}
                onClick={() => setShowConfirmPassword((current) => !current)}
                className="absolute inset-y-0 right-0 flex items-center px-3 text-muted-foreground transition-colors hover:text-foreground"
                disabled={loading}
              >
                {showConfirmPassword ? (
                  <EyeOff className="h-4 w-4" />
                ) : (
                  <Eye className="h-4 w-4" />
                )}
              </button>
            </div>
          </div>

          <button
            type="submit"
            disabled={loading || !!success}
            className="rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground hover:bg-primary/90 disabled:opacity-50"
          >
            {loading ? "Creating account..." : "Sign Up"}
          </button>
        </form>

        <p className="mt-6 text-center text-sm text-muted-foreground">
          Already have an account?{" "}
          <Link href="/login" className="font-medium text-primary hover:underline">
            Sign in
          </Link>
        </p>
      </div>
    </div>
  )
}
