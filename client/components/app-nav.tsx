"use client"

import Link from "next/link"
import Image from "next/image"
import { usePathname } from "next/navigation"
import { SignOutButton } from "@/components/sign-out-button"
import { cn } from "@/lib/utils"
import {
  AlertTriangle,
  BarChart3,
  Home,
  LayoutDashboard,
  ScanLine,
  SquarePen,
  UtensilsCrossed,
  User,
  Users,
} from "lucide-react"

const userNav = [
  { href: "/", label: "Home", icon: Home },
  { href: "/scan", label: "Scan", icon: ScanLine },
  { href: "/food-list", label: "Food List", icon: UtensilsCrossed },
  { href: "/manual-entry", label: "Manual Entry", icon: SquarePen },
  { href: "/account", label: "Account", icon: User },
]

const adminNav = [
  { href: "/admin", label: "Overview", icon: LayoutDashboard },
  { href: "/admin/analytics", label: "Analytics", icon: BarChart3 },
  { href: "/admin/users", label: "Users", icon: Users },
  { href: "/admin/errors", label: "Error Logs", icon: AlertTriangle },
]

type AppNavProps = {
  variant?: "default" | "admin"
}

export function AppNav({ variant = "default" }: AppNavProps) {
  const pathname = usePathname()

  const navItems = variant === "admin" ? adminNav : userNav

  function isNavActive(href: string) {
    if (href === "/") return pathname === href
    if (href === "/admin") return pathname === "/admin"
    return pathname === href || pathname.startsWith(`${href}/`)
  }

  return (
    <>
      <header className="sticky top-0 z-50 border-b border-border bg-card/80 backdrop-blur-md">
        <div className="mx-auto flex h-14 max-w-6xl items-center justify-between px-4">
          <Link href={variant === "admin" ? "/admin" : "/"} className="flex items-center gap-1.5">
            <Image
              src="/next.svg"
              alt="Fresh Trace"
              width={32}
              height={32}
              priority
              style={{ height: "auto" }}
            />
            <span className="hidden text-sm font-semibold tracking-tight md:inline">
              Fresh Trace
            </span>
          </Link>

          <nav className="hidden items-center gap-1 md:flex">
            {navItems.map((item) => {
              const isActive = isNavActive(item.href)

              return (
                <Link
                  key={item.href}
                  href={item.href}
                  className={cn(
                    "flex items-center gap-1.5 rounded-md px-3 py-2 text-sm font-medium transition-colors",
                    isActive
                      ? "bg-primary/10 text-primary"
                      : "text-muted-foreground hover:bg-accent hover:text-accent-foreground"
                  )}
                >
                  <item.icon className="h-4 w-4" />
                  {item.label}
                </Link>
              )
            })}
            {variant === "admin" ? (
              <SignOutButton
                variant="ghost"
                className="h-auto w-auto rounded-md px-3 py-2 text-sm font-medium shadow-none hover:bg-accent hover:text-accent-foreground"
              />
            ) : null}
          </nav>
        </div>
      </header>

      <nav
        className="fixed inset-x-0 bottom-0 z-50 border-t border-border bg-card/95 backdrop-blur-md md:hidden"
        aria-label="Main navigation"
      >
        <div className="mx-auto flex h-16 max-w-lg items-center justify-around px-2">
          {navItems.map((item) => {
            const isActive = isNavActive(item.href)

            return (
              <Link
                key={item.href}
                href={item.href}
                aria-current={isActive ? "page" : undefined}
                className={cn(
                  "flex flex-col items-center gap-0.5 rounded-lg px-3 py-1.5 transition-colors",
                  isActive ? "text-primary" : "text-muted-foreground"
                )}
              >
                <item.icon className={cn("h-5 w-5", isActive && "stroke-[2.5]")} />
                <span className="text-[10px] font-medium leading-none">{item.label}</span>
              </Link>
            )
          })}
        </div>
        <div className="h-[env(safe-area-inset-bottom)]" />
      </nav>
    </>
  )
}
