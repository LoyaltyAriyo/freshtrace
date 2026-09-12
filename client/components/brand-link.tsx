import Image from "next/image"
import Link from "next/link"
import { cn } from "@/lib/utils"

type BrandLinkProps = {
  href?: "/" | "/admin"
  className?: string
}

export function BrandLink({ href = "/", className }: BrandLinkProps) {
  return (
    <Link
      href={href}
      aria-label={href === "/admin" ? "FreshTrace admin home" : "FreshTrace home"}
      className={cn(
        "inline-flex min-h-20 shrink-0 items-center rounded-md focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring",
        className
      )}
    >
      <Image
        src="/brand/freshtrace-logo-horizontal.svg"
        alt=""
        // Integer dimensions with the exact 1028.8 × 240 SVG viewBox ratio.
        width={1286}
        height={300}
        className="h-auto w-64"
        // This small static SVG is always above the fold; no preload is needed.
        loading="eager"
        unoptimized
      />
    </Link>
  )
}
