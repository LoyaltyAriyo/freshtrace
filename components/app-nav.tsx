"use client"

import Link from "next/link"
import Image from "next/image"
import { usePathname } from "next/navigation"
import { cn } from "@/lib/utils"
import { Home, ScanLine, UtensilsCrossed, User } from "lucide-react"

const userNav = [
  { href: "/", label: "Home", icon: Home },
  { href: "/scan", label: "Scan", icon: ScanLine },
  { href: "/food-list", label: "Food List", icon: UtensilsCrossed },
  { href: "/manual-entry", label: "Manual Entry", icon: User },
]

export function AppNav() {
  const pathname = usePathname()

  return (
    <>
      <header className="sticky top-0 z-50 border-b border-border bg-card/80 backdrop-blur-md">
        <div className="mx-auto flex h-14 max-w-6xl items-center justify-between px-4">
          <Link href="/" className="flex items-center gap-1.5">
            <Image
              src="/images/logo-icon-light.png"
              alt="Fresh Trace"
              width={32}
              height={32}
              className="md:hidden"
              priority
            />
            <Image
              src="/images/logo-text-light.png"
              alt="Fresh Trace"
              width={140}
              height={40}
              className="hidden md:block"
              priority
            />
          </Link>

          <nav className="hidden items-center gap-1 md:flex">
            {userNav.map((item) => {
              const isActive =
                item.href === "/" ? pathname === item.href : pathname.startsWith(item.href)

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
          </nav>
        </div>
      </header>

      <nav
        className="fixed inset-x-0 bottom-0 z-50 border-t border-border bg-card/95 backdrop-blur-md md:hidden"
        role="tablist"
        aria-label="Main navigation"
      >
        <div className="mx-auto flex h-16 max-w-lg items-center justify-around px-2">
          {userNav.map((item) => {
            const isActive =
              item.href === "/" ? pathname === item.href : pathname.startsWith(item.href)

            return (
              <Link
                key={item.href}
                href={item.href}
                role="tab"
                aria-selected={isActive}
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