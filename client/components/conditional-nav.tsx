"use client"

import { usePathname } from "next/navigation"

import { AppNav } from "./app-nav"

export function ConditionalNav() {
  const pathname = usePathname()
  if (pathname.startsWith("/admin") || pathname.startsWith("/login")) return null
  return <AppNav />
}
