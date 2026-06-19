"use server"

import { createClient, createServiceClient } from "@/lib/supabase/server"
import { requireRole } from "@/lib/auth"
import { ROLES, ORDER_STATUS } from "@/lib/constants"
import { revalidatePath } from "next/cache"

export async function findOrderByCode(code: string) {
  const supabase = await createClient()

  const { data, error } = await supabase
    .from("orders")
    .select("*, order_items(*)")
    .eq("payment_code", code.toUpperCase())
    .eq("status", ORDER_STATUS.SIAP)
    .maybeSingle()

  if (error) throw error
  return data
}

export async function processPayment(orderId: string) {
  const session = await requireRole([ROLES.KASIR])

  // Use service client — kasir UPDATE RLS policy has broken with check
  // (defaults to status='Siap' which rejects the status change to 'Dibayar')
  const supabase = createServiceClient()

  const { data: order } = await supabase
    .from("orders")
    .select("status, total")
    .eq("id", orderId)
    .single()

  if (!order) throw new Error("Pesanan tidak ditemukan")
  if (order.status !== ORDER_STATUS.SIAP) throw new Error("Pesanan tidak dalam status Siap")
  if (order.status === ORDER_STATUS.DIBAYAR) throw new Error("Pesanan sudah dibayar")

  const { error: paymentError } = await supabase.from("payments").insert({
    order_id: orderId,
    amount: order.total,
    kasir_id: session.id,
  })

  if (paymentError) throw paymentError

  const { data, error } = await supabase
    .from("orders")
    .update({ status: ORDER_STATUS.DIBAYAR })
    .eq("id", orderId)
    .select()
    .single()

  if (error) throw error
  revalidatePath("/dashboard/kasir-panel")
  return data
}

export async function getSiapOrders() {
  const supabase = await createClient()

  const { data, error } = await supabase
    .from("orders")
    .select("*, order_items(*)")
    .eq("status", ORDER_STATUS.SIAP)
    .order("created_at", { ascending: true })

  if (error) throw error
  return data
}
