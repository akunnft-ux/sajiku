"use server"

import { createClient } from "@/lib/supabase/server"
import { requireRole } from "@/lib/auth"
import { ROLES } from "@/lib/constants"
import { revalidatePath } from "next/cache"
import { z } from "zod"

const createKasirSchema = z.object({
  username: z.string().min(3, "Username minimal 3 karakter").max(50),
  password: z.string().min(6, "Password minimal 6 karakter"),
})

export async function createKasir(input: { username: string; password: string }) {
  const session = await requireRole([ROLES.PENJUAL])
  const parsed = createKasirSchema.parse(input)

  const supabase = await createClient()

  // Create user via Supabase Auth
  const { data: authData, error: authError } = await supabase.auth.admin.createUser({
    email: `${parsed.username}@sajiku.local`,
    password: parsed.password,
    email_confirm: true,
    user_metadata: {
      role: ROLES.KASIR,
      username: parsed.username,
    },
  })

  if (authError) throw new Error(authError.message)

  // Insert into users table
  const { error } = await supabase.from("users").insert({
    id: authData.user.id,
    username: parsed.username,
    password_hash: "",
    role: ROLES.KASIR,
    created_by: session.id,
  })

  if (error) throw error
  revalidatePath("/dashboard/kasir")
  return authData.user
}

export async function getKasirList() {
  await requireRole([ROLES.PENJUAL])

  const supabase = await createClient()
  const { data, error } = await supabase
    .from("users")
    .select("id, username, role, is_active, created_at, created_by")
    .eq("role", ROLES.KASIR)
    .order("created_at", { ascending: false })

  if (error) throw error
  return data
}

export async function toggleKasirActive(kasirId: string) {
  await requireRole([ROLES.PENJUAL])

  const supabase = await createClient()

  const { data: current } = await supabase
    .from("users")
    .select("is_active")
    .eq("id", kasirId)
    .single()

  if (!current) throw new Error("Kasir tidak ditemukan")

  const { error } = await supabase
    .from("users")
    .update({ is_active: !current.is_active })
    .eq("id", kasirId)

  if (error) throw error
  revalidatePath("/dashboard/kasir")
}
