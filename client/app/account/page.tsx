import { redirect } from "next/navigation"

import { AccountShell } from "@/components/account/account-shell"
import { getCurrentAppUser } from "@/lib/auth/get-current-app-user"

export default async function AccountPage() {
  const user = await getCurrentAppUser()

  if (!user) {
    redirect("/login")
  }

  if (user.role === "ADMIN") {
    redirect("/admin")
  }

  return <AccountShell user={user} />
}
