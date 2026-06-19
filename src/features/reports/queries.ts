"use server"

import { createClient } from "@/lib/supabase/server"
import { requireRole } from "@/lib/auth"
import { ROLES } from "@/lib/constants"

export async function getDailyReport(fromDate: string, toDate: string) {
  await requireRole([ROLES.PENJUAL])

  const supabase = await createClient()

  const { data: orders, error } = await supabase
    .from("orders")
    .select("*, payments!inner(amount, paid_at, kasir_id)")
    .eq("status", "Dibayar")
    .gte("created_at", `${fromDate}T00:00:00`)
    .lte("created_at", `${toDate}T23:59:59`)
    .order("created_at", { ascending: false })

  if (error) throw error

  const totalRevenue = orders.reduce((sum, o) => sum + o.total, 0)

  return {
    orders,
    total_orders: orders.length,
    total_revenue: totalRevenue,
    avg_order_value: orders.length > 0 ? Math.round(totalRevenue / orders.length) : 0,
  }
}

export async function getMenuReport(fromDate: string, toDate: string) {
  await requireRole([ROLES.PENJUAL])

  const supabase = await createClient()

  const { data: orderItems, error } = await supabase
    .from("order_items")
    .select("menu_name, qty, subtotal, order_id, orders!inner(created_at, status)")
    .eq("orders.status", "Dibayar")
    .gte("orders.created_at", `${fromDate}T00:00:00`)
    .lte("orders.created_at", `${toDate}T23:59:59`)

  if (error) throw error

  const menuMap = new Map<
    string,
    { menu_name: string; qty: number; total: number }
  >()

  for (const item of orderItems) {
    const existing = menuMap.get(item.menu_name) || {
      menu_name: item.menu_name,
      qty: 0,
      total: 0,
    }
    existing.qty += item.qty
    existing.total += item.subtotal
    menuMap.set(item.menu_name, existing)
  }

  return Array.from(menuMap.values()).sort((a, b) => b.qty - a.qty)
}

export async function getOrderHistory(
  statusFilter?: string,
  fromDate?: string,
  toDate?: string
) {
  await requireRole([ROLES.PENJUAL])

  const supabase = await createClient()

  let query = supabase
    .from("orders")
    .select("*, order_items(*)")
    .order("created_at", { ascending: false })
    .limit(100)

  if (statusFilter && statusFilter !== "semua") {
    query = query.eq("status", statusFilter)
  }

  if (fromDate) {
    query = query.gte("created_at", `${fromDate}T00:00:00`)
  }
  if (toDate) {
    query = query.lte("created_at", `${toDate}T23:59:59`)
  }

  const { data, error } = await query
  if (error) throw error
  return data
}
