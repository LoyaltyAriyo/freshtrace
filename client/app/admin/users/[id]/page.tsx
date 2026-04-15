"use client"

import Link from "next/link"
import { useEffect, useState } from "react"
import { useParams } from "next/navigation"
import { Loader2 } from "lucide-react"

import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert"
import { Button } from "@/components/ui/button"

type AdminUserDetails = {
  id: string
  email: string
  fullName: string
  accountStatus: string
  activityStatus: string
}

export default function AdminUserDetailsPage() {
  const params = useParams<{ id: string }>()
  const userId = params?.id

  const [user, setUser] = useState<AdminUserDetails | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState("")

  useEffect(() => {
    let cancelled = false

    async function load() {
      if (!userId) {
        setError("User ID is required.")
        setLoading(false)
        return
      }

      setLoading(true)
      setError("")

      try {
        const response = await fetch(`/api/admin/users/${userId}`)
        const data = (await response.json().catch(() => null)) as
          | { user?: AdminUserDetails; error?: string }
          | null

        if (cancelled) return

        if (!response.ok) {
          setError(data?.error || "Failed to load user.")
          setUser(null)
          setLoading(false)
          return
        }

        if (!data?.user) {
          setError("Invalid response from server.")
          setUser(null)
          setLoading(false)
          return
        }

        setUser(data.user)
        setLoading(false)
      } catch {
        if (!cancelled) {
          setError("Failed to load user.")
          setUser(null)
          setLoading(false)
        }
      }
    }

    void load()

    return () => {
      cancelled = true
    }
  }, [userId])

  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-col gap-2 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">User details</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            View account name, email, and activity status
          </p>
        </div>

        <Button asChild variant="outline">
          <Link href="/admin/users">Back to users</Link>
        </Button>
      </div>

      {error && (
        <Alert variant="destructive" data-testid="admin-user-details-error">
          <AlertTitle>Unable to load user</AlertTitle>
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      )}

      {loading && (
        <div
          className="flex items-center gap-2 text-sm text-muted-foreground"
          data-testid="admin-user-details-loading"
        >
          <Loader2 className="h-4 w-4 animate-spin" />
          <span>Loading user…</span>
        </div>
      )}

      {!loading && !error && user && (
        <div className="rounded-lg border bg-card p-4" data-testid="admin-user-details-card">
          <dl className="grid gap-4 sm:grid-cols-3">
            <div className="space-y-1">
              <dt className="text-xs font-medium text-muted-foreground">Name</dt>
              <dd className="text-sm font-medium">{user.fullName}</dd>
            </div>
            <div className="space-y-1">
              <dt className="text-xs font-medium text-muted-foreground">Email</dt>
              <dd className="text-sm">{user.email}</dd>
            </div>
            <div className="space-y-1">
              <dt className="text-xs font-medium text-muted-foreground">Activity status</dt>
              <dd>
                <span
                  className={
                    user.accountStatus === "ACTIVE"
                      ? "inline-flex rounded-full bg-green-100 px-2 py-0.5 text-xs font-medium text-green-800"
                      : "inline-flex rounded-full bg-muted px-2 py-0.5 text-xs font-medium text-muted-foreground"
                  }
                >
                  {user.activityStatus}
                </span>
              </dd>
            </div>
          </dl>
        </div>
      )}
    </div>
  )
}

