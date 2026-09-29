"use client"

import { useRef, useState } from "react"
import { useRouter } from "next/navigation"
import { AuthField, AuthShell } from "@/components/auth/auth-shell"
import { Button } from "@/components/ui/button"
import styles from "@/components/auth/auth.module.css"

export default function SignupPage() {
  const router = useRouter()
  const [name, setName] = useState("")
  const [email, setEmail] = useState("")
  const [password, setPassword] = useState("")
  const [confirm, setConfirm] = useState("")
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
    <AuthShell mode="signup">
      <form onSubmit={handleSubmit} aria-label="Create an account" aria-busy={loading} className={styles.form}>
        {success && <div role="status" className={styles.success}>{success}</div>}
        {error && <div id="auth-error" role="alert" className={styles.error}>{error}</div>}
        <AuthField
          id="name"
          label="Full Name"
          type="text"
          autoComplete="name"
          name="name"
          value={name}
          onChange={(e) => setName(e.target.value)}
          placeholder="Enter your name"
          aria-describedby={error ? "auth-error" : undefined}
          disabled={loading}
        />
        <AuthField
          id="email"
          label="Email"
          type="email"
          autoComplete="email"
          name="email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          placeholder="Enter your email"
          aria-describedby={error ? "auth-error" : undefined}
          disabled={loading}
        />
        <AuthField
          id="password"
          label="Password"
          type="password"
          autoComplete="new-password"
          name="password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          placeholder="Enter your password"
          aria-describedby={error ? "auth-error" : undefined}
          disabled={loading}
        />
        <AuthField
          id="confirm"
          label="Confirm Password"
          type="password"
          autoComplete="new-password"
          name="confirm"
          value={confirm}
          onChange={(e) => setConfirm(e.target.value)}
          placeholder="Confirm your password"
          aria-describedby={error ? "auth-error" : undefined}
          disabled={loading}
        />
        <Button type="submit" disabled={loading || !!success} className={styles.submit}>
          {loading ? "Creating account..." : "Sign Up"}
        </Button>
      </form>
    </AuthShell>
  )
}
