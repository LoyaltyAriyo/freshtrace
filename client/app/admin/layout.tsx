import { AppNav } from "@/components/app-nav"

export default function AdminLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-screen bg-background">
      <AppNav variant="admin" />
      <main className="mx-auto max-w-6xl px-4 py-6 pb-24 md:pb-6">
        {children}
      </main>
    </div>
  )
}