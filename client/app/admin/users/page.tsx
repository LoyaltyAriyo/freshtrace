"use client"

import { useEffect, useState } from "react"
import { Loader2 } from "lucide-react"

import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
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

type StatusFilter = "all" | "ACTIVE" | "DISABLED"

function buildUsersUrl(search: string, status: StatusFilter): string {
  const params = new URLSearchParams()
  const trimmed = search.trim()
  if (trimmed.length > 0) {
    params.set("q", trimmed)
  }
  if (status !== "all") {
    params.set("status", status)
  }
  const query = params.toString()
  return query.length > 0 ? `/api/admin/users?${query}` : "/api/admin/users"
}

export default function AdminUsersPage() {
  const [users, setUsers] = useState<AdminUserRow[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState("")

  const [searchInput, setSearchInput] = useState("")
  const [debouncedSearch, setDebouncedSearch] = useState("")
  const [statusFilter, setStatusFilter] = useState<StatusFilter>("all")

  useEffect(() => {
    const handle = window.setTimeout(() => {
      setDebouncedSearch(searchInput)
    }, 300)
    return () => window.clearTimeout(handle)
  }, [searchInput])

  useEffect(() => {
    let cancelled = false

    async function load() {
      setLoading(true)
      setError("")

      try {
        const url = buildUsersUrl(debouncedSearch, statusFilter)
        const response = await fetch(url)
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
  }, [debouncedSearch, statusFilter])

  const filtersActive =
    debouncedSearch.trim().length > 0 || statusFilter !== "all"

  return (
    <div className="flex flex-col gap-6">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">Users</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Platform accounts (name, email, and activity status)
        </p>
      </div>

      <div
        className="flex flex-col gap-4 sm:flex-row sm:flex-wrap sm:items-end"
        data-testid="admin-users-filters"
      >
        <div className="flex min-w-[200px] flex-1 flex-col gap-1">
          <Label htmlFor="admin-users-search">Search</Label>
          <Input
            id="admin-users-search"
            type="search"
            placeholder="Search by name or email"
            value={searchInput}
            onChange={(e) => setSearchInput(e.target.value)}
            aria-label="Search users by name or email"
          />
        </div>
        <div className="flex w-full min-w-[180px] flex-col gap-1 sm:w-48">
          <Label htmlFor="admin-users-status">Activity status</Label>
          <Select
            value={statusFilter}
            onValueChange={(v) => setStatusFilter(v as StatusFilter)}
          >
            <SelectTrigger id="admin-users-status" aria-label="Filter by activity status">
              <SelectValue placeholder="All statuses" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All statuses</SelectItem>
              <SelectItem value="ACTIVE">Active only</SelectItem>
              <SelectItem value="DISABLED">Disabled only</SelectItem>
            </SelectContent>
          </Select>
        </div>
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
          {filtersActive ? "No users match your filters." : "No users found."}
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
