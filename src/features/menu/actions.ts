"use server"

import { createClient } from "@/lib/supabase/server"
import { requireRole } from "@/lib/auth"
import { menuItemSchema, type MenuItemInput } from "./schema"
import { ROLES } from "@/lib/constants"
import { revalidatePath } from "next/cache"

export async function getMenuItems(includeUnavailable = false) {
  const supabase = await createClient()

  let query = supabase.from("menu_items").select("*").order("name")

  if (!includeUnavailable) {
    query = query.eq("is_available", true)
  }

  const { data, error } = await query
  if (error) throw error
  return data
}

export async function createMenuItem(input: MenuItemInput) {
  await requireRole([ROLES.PENJUAL])

  const parsed = menuItemSchema.parse(input)

  const supabase = await createClient()
  const { data, error } = await supabase
    .from("menu_items")
    .insert({
      name: parsed.name,
      price: parsed.price,
      category: parsed.category || null,
      is_available: parsed.is_available,
    })
    .select()
    .single()

  if (error) throw error
  revalidatePath("/dashboard/menu")
  return data
}

export async function updateMenuItem(id: string, input: MenuItemInput) {
  await requireRole([ROLES.PENJUAL])

  const parsed = menuItemSchema.parse(input)

  const supabase = await createClient()
  const { data, error } = await supabase
    .from("menu_items")
    .update({
      name: parsed.name,
      price: parsed.price,
      category: parsed.category || null,
      is_available: parsed.is_available,
    })
    .eq("id", id)
    .select()
    .single()

  if (error) throw error
  revalidatePath("/dashboard/menu")
  return data
}

export async function toggleMenuItemAvailability(id: string) {
  await requireRole([ROLES.PENJUAL])

  const supabase = await createClient()

  const { data: current } = await supabase
    .from("menu_items")
    .select("is_available")
    .eq("id", id)
    .single()

  if (!current) throw new Error("Menu not found")

  const { data, error } = await supabase
    .from("menu_items")
    .update({ is_available: !current.is_available })
    .eq("id", id)
    .select()
    .single()

  if (error) throw error
  revalidatePath("/dashboard/menu")
  return data
}
