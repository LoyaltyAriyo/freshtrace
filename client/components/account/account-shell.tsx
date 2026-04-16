"use client"

import { useEffect, useMemo, useState, type FormEvent } from "react"
import {
  Crown,
  Mail,
  PencilLine,
  Plus,
  Sparkles,
  Trash2,
  User,
  UserPlus,
  Users,
} from "lucide-react"

import { SignOutButton } from "@/components/sign-out-button"
import { Avatar, AvatarFallback } from "@/components/ui/avatar"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { Separator } from "@/components/ui/separator"
import { Textarea } from "@/components/ui/textarea"
import { cn } from "@/lib/utils"

type AccountShellProps = {
  user: {
    id: string
    fullName: string
    email: string
    accountStatus: "ACTIVE" | "DISABLED"
  }
}

type HouseholdRole = "Member" | "Viewer"

type HouseholdMember = {
  id: string
  name: string
  email: string
  role: HouseholdRole
  notes: string
}

type MemberDraft = {
  name: string
  email: string
  role: HouseholdRole
  notes: string
}

const emptyDraft: MemberDraft = {
  name: "",
  email: "",
  role: "Member",
  notes: "",
}

function getInitials(name: string) {
  const initials = name
    .split(" ")
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0]?.toUpperCase() ?? "")
    .join("")

  return initials || "U"
}

function getHouseholdName(name: string) {
  const [firstName] = name.split(" ").filter(Boolean)
  return firstName ? `${firstName} Kitchen` : "My Kitchen"
}

function createMemberId() {
  return globalThis.crypto?.randomUUID?.() ?? `member-${Date.now()}`
}

function roleTone(role: HouseholdRole) {
  return role === "Member"
    ? "border-border bg-muted text-foreground"
    : "border-border bg-background text-muted-foreground"
}

export function AccountShell({ user }: AccountShellProps) {
  const [members, setMembers] = useState<HouseholdMember[]>([])
  const [dialogOpen, setDialogOpen] = useState(false)
  const [editingId, setEditingId] = useState<string | null>(null)
  const [draft, setDraft] = useState<MemberDraft>(emptyDraft)
  const [showErrors, setShowErrors] = useState(false)
  const [hasLoadedMembers, setHasLoadedMembers] = useState(false)

  const initials = getInitials(user.fullName)
  const householdName = getHouseholdName(user.fullName)
  const totalPeople = members.length + 1
  const memberCountLabel = totalPeople === 1 ? "1 person" : `${totalPeople} people`
  const isEditing = editingId !== null
  const hasDraftName = draft.name.trim().length > 0
  const hasDraftEmail = draft.email.trim().length > 0
  const isDraftValid = hasDraftName && hasDraftEmail
  const storageKey = useMemo(() => `fresh-trace-household:${user.id}`, [user.id])

  useEffect(() => {
    try {
      const storedMembers = window.localStorage.getItem(storageKey)

      if (storedMembers) {
        const parsedMembers = JSON.parse(storedMembers)

        if (Array.isArray(parsedMembers)) {
          setMembers(
            parsedMembers.filter((member): member is HouseholdMember => {
              return (
                typeof member === "object" &&
                member !== null &&
                typeof member.id === "string" &&
                typeof member.name === "string" &&
                typeof member.email === "string" &&
                (member.role === "Member" || member.role === "Viewer") &&
                typeof member.notes === "string"
              )
            }),
          )
        }
      }
    } catch {
      setMembers([])
    } finally {
      setHasLoadedMembers(true)
    }
  }, [storageKey])

  useEffect(() => {
    if (!hasLoadedMembers) {
      return
    }

    window.localStorage.setItem(storageKey, JSON.stringify(members))
  }, [hasLoadedMembers, members, storageKey])

  useEffect(() => {
    function syncMembersFromStorage(event: StorageEvent) {
      if (event.key !== storageKey) {
        return
      }

      try {
        const nextValue = event.newValue

        if (!nextValue) {
          setMembers([])
          return
        }

        const parsedMembers = JSON.parse(nextValue)

        if (Array.isArray(parsedMembers)) {
          setMembers(
            parsedMembers.filter((member): member is HouseholdMember => {
              return (
                typeof member === "object" &&
                member !== null &&
                typeof member.id === "string" &&
                typeof member.name === "string" &&
                typeof member.email === "string" &&
                (member.role === "Member" || member.role === "Viewer") &&
                typeof member.notes === "string"
              )
            }),
          )
        }
      } catch {
        setMembers([])
      }
    }

    window.addEventListener("storage", syncMembersFromStorage)

    return () => {
      window.removeEventListener("storage", syncMembersFromStorage)
    }
  }, [storageKey])

  function resetEditor() {
    setDialogOpen(false)
    setEditingId(null)
    setDraft(emptyDraft)
    setShowErrors(false)
  }

  function openCreateMember() {
    setEditingId(null)
    setDraft(emptyDraft)
    setShowErrors(false)
    setDialogOpen(true)
  }

  function openEditMember(member: HouseholdMember) {
    setEditingId(member.id)
    setDraft({
      name: member.name,
      email: member.email,
      role: member.role,
      notes: member.notes,
    })
    setShowErrors(false)
    setDialogOpen(true)
  }

  function handleSaveMember(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    setShowErrors(true)

    if (!isDraftValid) {
      return
    }

    if (editingId) {
      setMembers((current) =>
        current.map((member) =>
          member.id === editingId
            ? {
                ...member,
                name: draft.name.trim(),
                email: draft.email.trim(),
                role: draft.role,
                notes: draft.notes.trim(),
              }
            : member,
        ),
      )
    } else {
      setMembers((current) => [
        ...current,
        {
          id: createMemberId(),
          name: draft.name.trim(),
          email: draft.email.trim(),
          role: draft.role,
          notes: draft.notes.trim(),
        },
      ])
    }

    resetEditor()
  }

  function removeMember(memberId: string) {
    setMembers((current) => current.filter((member) => member.id !== memberId))
  }

  return (
    <div className="flex flex-col gap-5">
      <section className="relative overflow-hidden rounded-[2rem] border border-border bg-gradient-to-br from-muted/60 via-background to-background p-6 shadow-sm">
        <div className="absolute inset-x-0 top-0 h-20 bg-gradient-to-r from-muted/70 via-transparent to-transparent" />
        <div className="absolute -right-16 top-10 h-40 w-40 rounded-full bg-muted/70 blur-3xl" />
        <div className="absolute -left-10 bottom-0 h-28 w-28 rounded-full bg-muted/50 blur-2xl" />

        <div className="relative flex flex-col gap-6 lg:flex-row lg:items-end lg:justify-between">
          <div className="max-w-2xl">
            <Badge variant="outline" className="border-border bg-background/80 text-foreground">
              <Sparkles className="h-3.5 w-3.5" />
              Personal Space
            </Badge>

            <h1 className="mt-4 text-3xl font-semibold tracking-tight text-foreground sm:text-4xl">
              Account
            </h1>
            <p className="mt-2 max-w-xl text-sm leading-6 text-muted-foreground sm:text-base">
              Manage your profile and shape your household workspace with a cleaner, more
              flexible setup for shared kitchens.
            </p>

            <div className="mt-5 flex flex-wrap gap-2">
              <div className="rounded-full border border-border bg-background/[0.85] px-3 py-1.5 text-sm text-foreground shadow-xs">
                {memberCountLabel} in this household
              </div>
              <div className="rounded-full border border-border bg-background/[0.85] px-3 py-1.5 text-sm text-foreground shadow-xs">
                Kitchen owner
              </div>
            </div>
          </div>

          <div className="w-full max-w-sm rounded-3xl border border-border bg-background/[0.9] p-4 shadow-sm backdrop-blur">
            <div className="flex items-center gap-4">
              <Avatar className="h-16 w-16 border border-border bg-muted text-foreground">
                <AvatarFallback className="bg-muted text-lg font-semibold text-foreground">
                  {initials}
                </AvatarFallback>
              </Avatar>

              <div className="min-w-0 flex-1">
                <p className="truncate text-base font-semibold text-foreground">{user.fullName}</p>
                <p className="truncate text-sm text-muted-foreground">{user.email}</p>
                <div className="mt-3 flex flex-wrap gap-2">
                  <Badge variant="outline" className="border-border bg-muted text-foreground">
                    {user.accountStatus === "ACTIVE" ? "Active account" : "Disabled account"}
                  </Badge>
                  <Badge variant="outline" className="border-border bg-background text-foreground">
                    <Crown className="h-3.5 w-3.5" />
                    Owner
                  </Badge>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      <div className="grid gap-5 lg:grid-cols-[minmax(0,1.25fr)_minmax(280px,0.75fr)]">
        <Card className="gap-4 overflow-hidden border-border shadow-sm">
          <CardHeader className="border-b border-border/70 bg-muted/35">
            <CardTitle className="flex items-center gap-2 text-base">
              <User className="h-4 w-4 text-foreground" />
              Profile
            </CardTitle>
            <CardDescription>Your main household identity and contact details.</CardDescription>
          </CardHeader>
          <CardContent className="grid gap-4 pt-6 sm:grid-cols-[auto_minmax(0,1fr)]">
            <div className="flex justify-start sm:justify-center">
              <Avatar className="h-18 w-18 border border-border bg-muted text-foreground">
                <AvatarFallback className="bg-muted text-xl font-semibold text-foreground">
                  {initials}
                </AvatarFallback>
              </Avatar>
            </div>

            <div className="grid gap-4">
              <div>
                <p className="text-lg font-semibold text-foreground">{user.fullName}</p>
                <p className="mt-1 text-sm text-muted-foreground">
                  Household owner for {householdName}
                </p>
              </div>

              <div className="grid gap-3 rounded-2xl border border-border/80 bg-muted/30 p-4 sm:grid-cols-2">
                <div>
                  <p className="text-xs uppercase tracking-[0.18em] text-muted-foreground">
                    Contact
                  </p>
                  <div className="mt-2 flex items-center gap-2 text-sm text-foreground">
                    <Mail className="h-4 w-4 text-muted-foreground" />
                    <span className="truncate">{user.email}</span>
                  </div>
                </div>

                <div>
                  <p className="text-xs uppercase tracking-[0.18em] text-muted-foreground">
                    Household
                  </p>
                  <p className="mt-2 text-sm font-medium text-foreground">{householdName}</p>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="gap-4 border-border shadow-sm">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-base">
              <Users className="h-4 w-4 text-foreground" />
              Household Snapshot
            </CardTitle>
            <CardDescription>Quick status for the people sharing this kitchen.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="rounded-2xl border border-border/80 bg-muted/[0.35] p-4">
              <p className="text-xs uppercase tracking-[0.18em] text-muted-foreground">
                Active members
              </p>
              <p className="mt-2 text-3xl font-semibold text-foreground">{totalPeople}</p>
              <p className="mt-1 text-sm text-muted-foreground">Including you as owner.</p>
            </div>

            <Button className="w-full justify-center" onClick={openCreateMember}>
              <UserPlus className="h-4 w-4" />
              Add household member
            </Button>
          </CardContent>
        </Card>
      </div>

      <Card className="gap-4 border-border shadow-sm">
        <CardHeader className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
          <div>
            <CardTitle className="flex items-center gap-2 text-base">
              <Users className="h-4 w-4 text-foreground" />
              Household
            </CardTitle>
            <CardDescription>
              Shared kitchen members. You can add, edit, or remove entries on this page.
            </CardDescription>
          </div>

          <Button variant="outline" onClick={openCreateMember} className="shrink-0">
            <Plus className="h-4 w-4" />
            Add member
          </Button>
        </CardHeader>

        <CardContent className="space-y-4">
          <div className="rounded-2xl border border-border bg-muted/35 p-4">
            <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
              <div className="flex items-center gap-3">
                <Avatar className="h-11 w-11 border border-border bg-muted text-foreground">
                  <AvatarFallback className="bg-muted font-semibold text-foreground">
                    {initials}
                  </AvatarFallback>
                </Avatar>

                <div>
                  <div className="flex flex-wrap items-center gap-2">
                    <p className="text-sm font-semibold text-foreground">{user.fullName}</p>
                    <Badge variant="outline" className="text-[10px]">
                      You
                    </Badge>
                  </div>
                  <p className="text-sm text-muted-foreground">{user.email}</p>
                </div>
              </div>

              <Badge variant="outline" className="w-fit border-border bg-background text-foreground">
                <Crown className="h-3.5 w-3.5" />
                Owner
              </Badge>
            </div>
          </div>

          <Separator />

          {members.length === 0 ? (
            <div className="rounded-2xl border border-dashed border-border p-6 text-center">
              <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-muted text-foreground">
                <UserPlus className="h-5 w-5" />
              </div>
              <p className="mt-4 text-base font-semibold text-foreground">
                No household members yet
              </p>
              <p className="mt-2 text-sm leading-6 text-muted-foreground">
                Start building out the shared kitchen by adding members to this UI preview.
              </p>
              <Button onClick={openCreateMember} className="mt-5">
                <Plus className="h-4 w-4" />
                Add first member
              </Button>
            </div>
          ) : (
            <div className="space-y-3">
              {members.map((member) => (
                <div
                  key={member.id}
                  className="rounded-2xl border border-border/80 bg-background p-4 shadow-xs"
                >
                  <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
                    <div className="flex items-start gap-3">
                      <Avatar className="h-11 w-11 border border-border bg-muted text-foreground">
                        <AvatarFallback className="bg-muted font-semibold text-foreground">
                          {getInitials(member.name)}
                        </AvatarFallback>
                      </Avatar>

                      <div className="min-w-0">
                        <div className="flex flex-wrap items-center gap-2">
                          <p className="text-sm font-semibold text-foreground">{member.name}</p>
                          <Badge variant="outline" className={cn("text-[10px]", roleTone(member.role))}>
                            {member.role}
                          </Badge>
                        </div>
                        <p className="mt-1 text-sm text-muted-foreground">{member.email}</p>
                        {member.notes ? (
                          <p className="mt-2 max-w-2xl text-sm leading-6 text-muted-foreground">
                            {member.notes}
                          </p>
                        ) : (
                          <p className="mt-2 text-sm text-muted-foreground">
                            No extra notes for this member yet.
                          </p>
                        )}
                      </div>
                    </div>

                    <div className="flex items-center gap-2">
                      <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        onClick={() => openEditMember(member)}
                      >
                        <PencilLine className="h-4 w-4" />
                        Edit
                      </Button>
                      <Button
                        type="button"
                        variant="ghost"
                        size="sm"
                        onClick={() => removeMember(member.id)}
                        className="text-muted-foreground hover:text-destructive"
                      >
                        <Trash2 className="h-4 w-4" />
                        Remove
                      </Button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      <SignOutButton className="justify-center" />

      <Dialog open={dialogOpen} onOpenChange={(open) => (open ? setDialogOpen(true) : resetEditor())}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{isEditing ? "Edit household member" : "Add household member"}</DialogTitle>
            <DialogDescription>
              Update the saved household list for this signed-in account.
            </DialogDescription>
          </DialogHeader>

          <form className="space-y-4" onSubmit={handleSaveMember}>
            <div className="space-y-2">
              <Label htmlFor="household-member-name">Name</Label>
              <Input
                id="household-member-name"
                value={draft.name}
                onChange={(event) =>
                  setDraft((current) => ({
                    ...current,
                    name: event.target.value,
                  }))
                }
                aria-invalid={showErrors && !hasDraftName}
                placeholder="Jordan Lee"
              />
              {showErrors && !hasDraftName ? (
                <p className="text-sm text-destructive">Enter a member name.</p>
              ) : null}
            </div>

            <div className="space-y-2">
              <Label htmlFor="household-member-email">Email</Label>
              <Input
                id="household-member-email"
                type="email"
                value={draft.email}
                onChange={(event) =>
                  setDraft((current) => ({
                    ...current,
                    email: event.target.value,
                  }))
                }
                aria-invalid={showErrors && !hasDraftEmail}
                placeholder="jordan@example.com"
              />
              {showErrors && !hasDraftEmail ? (
                <p className="text-sm text-destructive">Enter an email address.</p>
              ) : null}
            </div>

            <div className="space-y-2">
              <Label>Role</Label>
              <Select
                value={draft.role}
                onValueChange={(value: HouseholdRole) =>
                  setDraft((current) => ({
                    ...current,
                    role: value,
                  }))
                }
              >
                <SelectTrigger className="w-full">
                  <SelectValue placeholder="Select role" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="Member">Member</SelectItem>
                  <SelectItem value="Viewer">Viewer</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label htmlFor="household-member-notes">Notes</Label>
              <Textarea
                id="household-member-notes"
                value={draft.notes}
                onChange={(event) =>
                  setDraft((current) => ({
                    ...current,
                    notes: event.target.value,
                  }))
                }
                placeholder="Optional notes about shopping preferences, responsibilities, or access."
              />
            </div>

            <DialogFooter>
              <Button type="button" variant="ghost" onClick={resetEditor}>
                Cancel
              </Button>
              <Button type="submit">
                {isEditing ? "Save changes" : "Add member"}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  )
}
