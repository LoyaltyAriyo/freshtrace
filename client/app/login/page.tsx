"use client"

import { useState } from "react"
import { navigateAfterLogin } from "@/lib/auth/navigate-after-login"
import { AuthField, AuthShell } from "@/components/auth/auth-shell"
import { Button } from "@/components/ui/button"
import styles from "@/components/auth/auth.module.css"

function getErrorMessage(error: unknown) {
  return error instanceof Error ? error.message : "Something went wrong"
}

export default function LoginPage() {
  const [email, setEmail] = useState("")
  const [password, setPassword] = useState("")
  const [error, setError] = useState("")
  const [loading, setLoading] = useState(false)

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!email || !password) {
      setError("Please enter your email and password.")
      return
    }
    setLoading(true)
    setError("")
    try {
      const response = await fetch("/api/auth/login", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ email, password }),
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

      const role = data?.user?.role

      navigateAfterLogin(role)
    } catch (error: unknown) {
      setError(getErrorMessage(error))
    } finally {
      setLoading(false)
    }
  }

  return (
    <AuthShell mode="login">
      <form onSubmit={handleSubmit} aria-label="Sign in" aria-busy={loading} className={styles.form}>
        {error && <div id="auth-error" role="alert" className={styles.error}>{error}</div>}
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
          autoComplete="current-password"
          name="password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          placeholder="Enter your password"
          aria-describedby={error ? "auth-error" : undefined}
          disabled={loading}
        />
        <Button type="submit" disabled={loading} className={styles.submit}>
          {loading ? "Signing in..." : "Sign In"}
        </Button>
      </form>
    </AuthShell>
  )
}
