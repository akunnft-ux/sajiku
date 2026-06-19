"use server"

import { createClient } from "@/lib/supabase/server"
import { revalidatePath } from "next/cache"
import { redirect } from "next/navigation"

export async function login(formData: FormData) {
  const username = formData.get("username") as string
  const password = formData.get("password") as string

  if (!username || !password) {
    throw new Error("Username dan password wajib diisi")
  }

  const supabase = await createClient()

  // For simplicity, we use email auth with a constructed email
  const { error } = await supabase.auth.signInWithPassword({
    email: `${username}@sajiku.local`,
    password,
  })

  if (error) throw new Error("Username atau password salah")
  revalidatePath("/dashboard")
  redirect("/dashboard")
}

export async function logout() {
  const supabase = await createClient()
  await supabase.auth.signOut()
  revalidatePath("/login")
  redirect("/login")
}
