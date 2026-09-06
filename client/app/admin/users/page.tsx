"use client"

import { useEffect, useMemo, useState } from "react"
import { Loader2, Search, Users, UserCheck, UserX } from "lucide-react"

import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
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

function getStatusValue(user: AdminUserRow): string {
  return user.activityStatus || user.accountStatus || "UNKNOWN"
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

  const summary = useMemo(() => {
    const active = users.filter(
      (u) => getStatusValue(u).toUpperCase() === "ACTIVE"
    ).length

    const disabled = users.filter(
      (u) => getStatusValue(u).toUpperCase() === "DISABLED"
    ).length

    return {
      total: users.length,
      active,
      disabled,
    }
  }, [users])

  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight text-foreground">
            Users
          </h1>
          <p className="mt-1 text-sm text-muted-foreground">
            Admin view of platform accounts, contact details, and activity status
          </p>
        </div>
      </div>

      <section
        className="grid gap-4 sm:grid-cols-3"
        aria-label="User summary cards"
      >
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Total Users
            </CardTitle>
            <Users className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-semibold text-foreground">
              {summary.total}
            </div>
            <p className="mt-1 text-xs text-muted-foreground">
              Accounts returned by current query
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Active Users
            </CardTitle>
            <UserCheck className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-semibold text-foreground">
              {summary.active}
            </div>
            <p className="mt-1 text-xs text-muted-foreground">
              Users currently marked active
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Disabled Users
            </CardTitle>
            <UserX className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-semibold text-foreground">
              {summary.disabled}
            </div>
            <p className="mt-1 text-xs text-muted-foreground">
              Users currently marked disabled
            </p>
          </CardContent>
        </Card>
      </section>

      <Card>
        <CardHeader className="pb-4">
          <CardTitle className="text-base">Filters</CardTitle>
        </CardHeader>
        <CardContent>
          <div
            className="flex flex-col gap-4 sm:flex-row sm:flex-wrap sm:items-end"
            data-testid="admin-users-filters"
          >
            <div className="flex min-w-[220px] flex-1 flex-col gap-1">
              <Label htmlFor="admin-users-search">Search</Label>
              <div className="relative">
                <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                <Input
                  id="admin-users-search"
                  type="search"
                  placeholder="Search by name or email"
                  value={searchInput}
                  onChange={(e) => setSearchInput(e.target.value)}
                  aria-label="Search users by name or email"
                  className="pl-9"
                />
              </div>
            </div>

            <div className="flex w-full min-w-[180px] flex-col gap-1 sm:w-56">
              <Label htmlFor="admin-users-status">Activity status</Label>
              <Select
                value={statusFilter}
                onValueChange={(v) => setStatusFilter(v as StatusFilter)}
              >
                <SelectTrigger
                  id="admin-users-status"
                  aria-label="Filter by activity status"
                >
                  <SelectValue placeholder="All statuses" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All statuses</SelectItem>
                  <SelectItem value="ACTIVE">Active only</SelectItem>
                  <SelectItem value="DISABLED">Disabled only</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {filtersActive && (
              <Button
                type="button"
                variant="outline"
                onClick={() => {
                  setSearchInput("")
                  setDebouncedSearch("")
                  setStatusFilter("all")
                }}
              >
                Clear filters
              </Button>
            )}
          </div>
        </CardContent>
      </Card>

      {error && (
        <Alert variant="destructive" data-testid="admin-users-error">
          <AlertTitle>Unable to load users</AlertTitle>
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      )}

      {loading && (
        <div
          className="flex items-center gap-2 text-sm text-muted-foreground"
          data-testid="admin-users-loading"
        >
          <Loader2 className="h-4 w-4 animate-spin" />
          <span>Loading users...</span>
        </div>
      )}

      {!loading && !error && users.length === 0 && (
        <Card>
          <CardContent className="py-10">
            <p
              className="text-sm text-muted-foreground"
              data-testid="admin-users-empty"
            >
              {filtersActive ? "No users match your filters." : "No users found."}
            </p>
          </CardContent>
        </Card>
      )}

      {!loading && users.length > 0 && (
        <Card>
          <CardHeader className="pb-4">
            <CardTitle className="text-base">User List</CardTitle>
          </CardHeader>
          <CardContent>
            <Table data-testid="admin-users-table">
              <TableHeader>
                <TableRow>
                  <TableHead>Name</TableHead>
                  <TableHead>Email</TableHead>
                  <TableHead>Activity status</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {users.map((u) => {
                  const status = getStatusValue(u)
                  const normalizedStatus = status.toUpperCase()

                  return (
                    <TableRow key={u.id}>
                      <TableCell className="font-medium">{u.fullName}</TableCell>
                      <TableCell>{u.email}</TableCell>
                      <TableCell>
                        <Badge
                          variant="outline"
                          className={
                            normalizedStatus === "ACTIVE"
                              ? "border-green-200 bg-green-100 text-green-800"
                              : "border-slate-200 bg-slate-100 text-slate-700"
                          }
                        >
                          {status}
                        </Badge>
                      </TableCell>
                    </TableRow>
                  )
                })}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      )}
    </div>
  )
}
