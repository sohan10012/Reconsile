import { redirect } from "next/navigation"
import { AuthForm } from "@/components/auth-form"
import { getSession } from "@/lib/session"

export default async function SignUpPage() {
  const session = await getSession()
  if (session) redirect("/dashboard")
  return <AuthForm mode="sign-up" />
}
