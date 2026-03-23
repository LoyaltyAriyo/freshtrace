import type { Metadata, Viewport } from "next"
import { Inter, DM_Sans } from "next/font/google"
import { Toaster } from "@/components/ui/sonner"
import "./globals.css"
import { AppNav } from "@/components/app-nav"

const inter = Inter({
  subsets: ["latin"],
  variable: "--font-inter",
})

const dmSans = DM_Sans({
  subsets: ["latin"],
  variable: "--font-dm-sans",
})

export const metadata: Metadata = {
  title: "Fresh Trace",
  description: "Food tracking and waste reduction application",
  icons: {
    icon: [
      {
        url: "/icon-light-32x32.png",
        media: "(prefers-color-scheme: light)",
      },
      {
        url: "/icon-dark-32x32.png",
        media: "(prefers-color-scheme: dark)",
      },
      {
        url: "/icon.svg",
        type: "image/svg+xml",
      },
    ],
    apple: "/apple-icon.png",
  },
}

export const viewport: Viewport = {
  themeColor: "#3a9a5c",
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
      <body
        suppressHydrationWarning
        className={`${inter.variable} ${dmSans.variable} font-sans antialiased`}
      >
        <div className="min-h-screen bg-background">
          <AppNav />
          <main className="mx-auto max-w-6xl px-4 py-6 pb-24 md:pb-6">{children}</main>
        </div>
        <Toaster position="top-center" richColors />
      </body>
    </html>
  )
}