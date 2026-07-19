import { redirect } from "next/navigation"
import { AuthForm } from "@/components/auth-form"
import { getSession } from "@/lib/session"

export default async function SignInPage() {
  const session = await getSession()
  if (session) redirect("/dashboard")
  return <AuthForm mode="sign-in" />
}
