import { createServerClient } from "@supabase/ssr"
import { cookies } from "next/headers"
import type { Role } from "./constants"

export async function verifySession() {
  const cookieStore = await cookies()
  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() { return cookieStore.getAll() },
        setAll() {},
      },
    }
  )

  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return null

  return {
    id: user.id,
    email: user.email,
    role: user.user_metadata?.role as Role,
    username: user.user_metadata?.username as string,
  }
}

export async function requireRole(allowedRoles: Role[]) {
  const session = await verifySession()
  if (!session) throw new Error("Unauthorized")
  if (!allowedRoles.includes(session.role)) throw new Error("Forbidden")
  return session
}

export async function requireAuth() {
  const session = await verifySession()
  if (!session) throw new Error("Unauthorized")
  return session
}
