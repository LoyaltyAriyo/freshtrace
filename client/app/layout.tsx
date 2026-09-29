import type { Metadata, Viewport } from "next"
import { Toaster } from "@/components/ui/sonner"
import "./globals.css"
import { ConditionalNav } from "@/components/conditional-nav"

export const metadata: Metadata = {
  title: "FreshTrace",
  applicationName: "FreshTrace",
  description: "Food tracking and waste reduction application",
  icons: {
    icon: [
      {
        url: "/brand/icons/favicon-32x32.png",
        sizes: "32x32",
        type: "image/png",
      },
      {
        url: "/brand/icons/favicon-16x16.png",
        sizes: "16x16",
        type: "image/png",
      },
      {
        url: "/brand/icons/favicon.svg",
        sizes: "any",
        type: "image/svg+xml",
      },
    ],
    apple: [{ url: "/brand/icons/apple-touch-icon.png", sizes: "180x180", type: "image/png" }],
  },
}

export const viewport: Viewport = {
  themeColor: "#005F35",
  width: "device-width",
  initialScale: 1,
}

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode
}>) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body suppressHydrationWarning className="font-sans antialiased">
        <div className="min-h-screen bg-background">
          <ConditionalNav />
          <main className="mx-auto max-w-6xl px-4 py-6 pb-24 lg:pb-6 has-[[data-auth-page]]:max-w-none has-[[data-auth-page]]:p-0">{children}</main>
        </div>
        <Toaster position="top-center" richColors />
      </body>
    </html>
  )
}
