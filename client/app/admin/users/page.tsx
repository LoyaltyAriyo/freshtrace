"use client"

import { useEffect, useState } from "react"
import { Loader2 } from "lucide-react"

import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"

type AdminUserRow = {
  id: string
  email: string
  fullName: string
  accountStatus: string
  activityStatus: string
}

export default function AdminUsersPage() {
  const [users, setUsers] = useState<AdminUserRow[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState("")

  useEffect(() => {
    let cancelled = false

    async function load() {
      setLoading(true)
      setError("")

      try {
        const response = await fetch("/api/admin/users")
        const data = (await response.json().catch(() => null)) as
          | { users?: AdminUserRow[]; error?: string }
          | null

        if (cancelled) return

        if (!response.ok) {
          setError(data?.error || "Failed to load users.")
          setUsers([])
          setLoading(false)
          return
        }

        if (!data || !Array.isArray(data.users)) {
          setError("Invalid response from server.")
          setUsers([])
          setLoading(false)
          return
        }

        setUsers(data.users)
        setLoading(false)
      } catch {
        if (!cancelled) {
          setError("Failed to load users.")
          setUsers([])
          setLoading(false)
        }
      }
    }

    void load()

    return () => {
      cancelled = true
    }
  }, [])

  return (
    <div className="flex flex-col gap-6">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">Users</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Platform accounts (name, email, and activity status)
        </p>
      </div>

      {error && (
        <Alert variant="destructive" data-testid="admin-users-error">
          <AlertTitle>Unable to load users</AlertTitle>
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      )}

      {loading && (
        <div className="flex items-center gap-2 text-sm text-muted-foreground" data-testid="admin-users-loading">
          <Loader2 className="h-4 w-4 animate-spin" />
          <span>Loading users…</span>
        </div>
      )}

      {!loading && !error && users.length === 0 && (
        <p className="text-sm text-muted-foreground" data-testid="admin-users-empty">
          No users found.
        </p>
      )}

      {!loading && users.length > 0 && (
        <Table data-testid="admin-users-table">
          <TableHeader>
            <TableRow>
              <TableHead>Name</TableHead>
              <TableHead>Email</TableHead>
              <TableHead>Activity status</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {users.map((u) => (
              <TableRow key={u.id}>
                <TableCell className="font-medium">{u.fullName}</TableCell>
                <TableCell>{u.email}</TableCell>
                <TableCell>
                  <span
                    className={
                      u.accountStatus === "ACTIVE"
                        ? "inline-flex rounded-full bg-green-100 px-2 py-0.5 text-xs font-medium text-green-800"
                        : "inline-flex rounded-full bg-muted px-2 py-0.5 text-xs font-medium text-muted-foreground"
                    }
                  >
                    {u.activityStatus}
                  </span>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      )}
    </div>
  )
}
