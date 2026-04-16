"use client"

import { useState } from "react"
import { LogOut } from "lucide-react"

import { Button } from "@/components/ui/button"
import { cn } from "@/lib/utils"

type SignOutButtonProps = {
  className?: string
  variant?: "outline" | "ghost"
}

export function SignOutButton({
  className,
  variant = "outline",
}: SignOutButtonProps) {
  const [signingOut, setSigningOut] = useState(false)

  async function handleSignOut() {
    if (signingOut) return

    setSigningOut(true)

    try {
      await fetch("/api/auth/logout", { method: "POST" })
    } catch {
      // Best-effort logout still redirects to the login screen.
    } finally {
      setSigningOut(false)
      window.location.href = "/login"
    }
  }

  return (
    <Button
      type="button"
      variant={variant}
      onClick={handleSignOut}
      disabled={signingOut}
      className={cn("w-full text-muted-foreground", className)}
    >
      <LogOut className="h-4 w-4" />
      {signingOut ? "Signing out..." : "Sign Out"}
    </Button>
  )
}
