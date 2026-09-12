import { existsSync, readFileSync, readdirSync } from "node:fs"
import path from "node:path"
import { describe, expect, it, vi } from "vitest"
import { metadata, viewport } from "./layout"
import manifest from "./manifest"

vi.mock("@/components/conditional-nav", () => ({ ConditionalNav: () => null }))
vi.mock("@/components/ui/sonner", () => ({ Toaster: () => null }))

describe("FreshTrace application metadata", () => {
  it("preserves the description and uses a consistent application name and viewport theme", () => {
    expect(metadata.title).toBe("FreshTrace")
    expect(metadata.applicationName).toBe("FreshTrace")
    expect(metadata.description).toBe("Food tracking and waste reduction application")
    expect(viewport.themeColor).toBe("#005F35")
    expect(metadata).not.toHaveProperty("themeColor")
  })

  it("declares the supplied SVG, PNG fallbacks and Apple icon exactly once", () => {
    expect(metadata.icons).toEqual({
      icon: [
        { url: "/brand/icons/favicon-32x32.png", sizes: "32x32", type: "image/png" },
        { url: "/brand/icons/favicon-16x16.png", sizes: "16x16", type: "image/png" },
        { url: "/brand/icons/favicon.svg", sizes: "any", type: "image/svg+xml" },
      ],
      apple: [{ url: "/brand/icons/apple-touch-icon.png", sizes: "180x180", type: "image/png" }],
    })
  })

  it("provides one file-based manifest with purpose-any application icons", () => {
    expect(manifest()).toMatchObject({
      name: "FreshTrace", short_name: "FreshTrace", description: metadata.description,
      start_url: "/", display: "standalone", background_color: "#F8F9F8", theme_color: viewport.themeColor,
    })
    expect(manifest().icons).toEqual([
      { src: "/brand/icons/icon-192.png", sizes: "192x192", type: "image/png", purpose: "any" },
      { src: "/brand/icons/icon-512.png", sizes: "512x512", type: "image/png", purpose: "any" },
    ])
    expect(metadata.manifest).toBeUndefined()
    const metadataFiles = readdirSync(path.join(process.cwd(), "app"), { recursive: true })
      .filter((file) => /(^|\/)(favicon|icon\d*|apple-icon\d*|manifest)\.(ico|svg|png|jpg|jpeg|webmanifest|json|tsx?|jsx?)$/.test(String(file)))
    expect(metadataFiles).toEqual(["manifest.ts"])
  })

  it("resolves every declared icon and logo to a real static public file", () => {
    const icons = metadata.icons as { icon: { url: string }[]; apple: { url: string }[] }
    const urls = [...icons.icon.map(({ url }) => url), ...icons.apple.map(({ url }) => url),
      ...manifest().icons!.map(({ src }) => src), "/brand/freshtrace-logo-horizontal.svg"]
    expect(new Set(urls).size).toBe(urls.length)
    for (const url of urls) {
      expect(url).toMatch(/^\/brand\/[a-z0-9/.-]+$/)
      expect(existsSync(path.join(process.cwd(), "public", url))).toBe(true)
    }
    const source = readFileSync(path.join(process.cwd(), "components/brand-link.tsx"), "utf8")
    expect(source).not.toMatch(/next\.svg|vercel\.svg|data:image|\.png/)
  })
})
