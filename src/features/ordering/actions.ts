"use server"

import { createClient, createServiceClient } from "@/lib/supabase/server"
import { requireRole } from "@/lib/auth"
import { createOrderSchema, type CreateOrderInput } from "./schema"
import { ROLES, ORDER_STATUS } from "@/lib/constants"
import { generatePaymentCode } from "@/lib/payment-code"
import { revalidatePath } from "next/cache"

export async function createOrder(input: CreateOrderInput) {
  const parsed = createOrderSchema.parse(input)

  // Use service client to bypass missing anon role grants on orders/order_items
  const supabase = createServiceClient()

  // Fetch current prices for all ordered items
  const { data: menuItems } = await supabase
    .from("menu_items")
    .select("id, name, price")
    .in("id", parsed.items.map((i) => i.menu_id))

  if (!menuItems || menuItems.length !== parsed.items.length) {
    throw new Error("Beberapa menu tidak ditemukan")
  }

  const menuMap = new Map(menuItems.map((m) => [m.id, m]))
  let total = 0
  const orderItems = parsed.items.map((item) => {
    const menu = menuMap.get(item.menu_id)
    if (!menu) throw new Error(`Menu ${item.menu_id} tidak ditemukan`)
    const subtotal = menu.price * item.qty
    total += subtotal
    return {
      menu_id: item.menu_id,
      menu_name: menu.name,
      price: menu.price,
      qty: item.qty,
      subtotal,
    }
  })

  // Generate unique payment code
  let paymentCode = generatePaymentCode()
  let attempts = 0
  while (attempts < 5) {
    const { data: existing } = await supabase
      .from("orders")
      .select("id")
      .eq("payment_code", paymentCode)
      .maybeSingle()
    if (!existing) break
    paymentCode = generatePaymentCode()
    attempts++
  }

  const { data: order, error } = await supabase
    .from("orders")
    .insert({
      table_no: parsed.table_no,
      customer_name: parsed.customer_name,
      status: ORDER_STATUS.BARU,
      payment_code: paymentCode,
      total,
      notes: parsed.notes || null,
    })
    .select()
    .single()

  if (error) throw error

  // Insert order items
  const { error: itemsError } = await supabase.from("order_items").insert(
    orderItems.map((item) => ({ ...item, order_id: order.id }))
  )

  if (itemsError) throw itemsError

  revalidatePath("/dashboard")
  return order
}

export async function acceptOrder(orderId: string) {
  await requireRole([ROLES.PENJUAL])

  const supabase = await createClient()

  const { data: order } = await supabase
    .from("orders")
    .select("status")
    .eq("id", orderId)
    .single()

  if (!order) throw new Error("Pesanan tidak ditemukan")
  if (order.status !== ORDER_STATUS.BARU) throw new Error("Pesanan sudah diproses")

  const { data, error } = await supabase
    .from("orders")
    .update({ status: ORDER_STATUS.DIPROSES })
    .eq("id", orderId)
    .select()
    .single()

  if (error) throw error
  revalidatePath("/dashboard")
  return data
}

export async function markOrderReady(orderId: string) {
  await requireRole([ROLES.PENJUAL])

  const supabase = await createClient()

  const { data: order } = await supabase
    .from("orders")
    .select("status")
    .eq("id", orderId)
    .single()

  if (!order) throw new Error("Pesanan tidak ditemukan")
  if (order.status !== ORDER_STATUS.DIPROSES) throw new Error("Pesanan tidak dalam proses")

  const { data, error } = await supabase
    .from("orders")
    .update({ status: ORDER_STATUS.SIAP })
    .eq("id", orderId)
    .select()
    .single()

  if (error) throw error
  revalidatePath("/dashboard")
  return data
}

export async function cancelOrder(orderId: string, reason: string) {
  const supabase = createServiceClient()

  const { data: order } = await supabase
    .from("orders")
    .select("status")
    .eq("id", orderId)
    .single()

  if (!order) throw new Error("Pesanan tidak ditemukan")
  if (order.status === ORDER_STATUS.DIBAYAR) throw new Error("Pesanan sudah dibayar")

  const { data, error } = await supabase
    .from("orders")
    .update({
      status: ORDER_STATUS.DIBATALKAN,
      cancelled_at: new Date().toISOString(),
      cancelled_by: null,
      cancel_reason: reason,
    })
    .eq("id", orderId)
    .select()
    .single()

  if (error) throw error
  revalidatePath("/dashboard")
  return data
}

export async function getOrders(statusFilter?: string) {
  const supabase = await createClient()

  let query = supabase
    .from("orders")
    .select("*, order_items(*)")
    .order("created_at", { ascending: false })

  if (statusFilter && statusFilter !== "semua") {
    query = query.eq("status", statusFilter)
  }

  const { data, error } = await query
  if (error) throw error
  return data
}

export async function getOrderById(orderId: string) {
  // Use service client — no public SELECT policy exists for orders/order_items
  const supabase = createServiceClient()

  const { data, error } = await supabase
    .from("orders")
    .select("*, order_items(*)")
    .eq("id", orderId)
    .single()

  if (error) return null
  return data
}
