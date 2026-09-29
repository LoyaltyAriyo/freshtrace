import Image from "next/image"
import Link from "next/link"
import { cn } from "@/lib/utils"
import styles from "./brand-link.module.css"

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
        "inline-flex min-h-11 shrink-0 items-center gap-2 rounded-md focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring",
        styles.brand,
        className
      )}
    >
      <Image
        src="/brand/freshtrace-logo-mark-monochrome.svg"
        alt=""
        width={28}
        height={28}
        className="size-7"
        // This small static SVG is always above the fold; no preload is needed.
        loading="eager"
        unoptimized
      />
      <span aria-hidden="true">FreshTrace</span>
    </Link>
  )
}
