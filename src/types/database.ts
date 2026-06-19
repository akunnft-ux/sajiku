// Database types based on the schema
// These types correspond to the PostgreSQL tables

export interface MenuItem {
  id: string
  name: string
  price: number
  category: string | null
  image_url: string | null
  is_available: boolean
  created_at: string
  updated_at: string
}

export interface Order {
  id: string
  table_no: number
  customer_name: string
  status: "Baru" | "Diproses" | "Siap" | "Dibayar" | "Dibatalkan"
  payment_code: string
  total: number
  notes: string | null
  cancelled_at: string | null
  cancelled_by: string | null
  cancel_reason: string | null
  created_at: string
  updated_at: string
}

export interface OrderItem {
  id: string
  order_id: string
  menu_id: string | null
  menu_name: string
  price: number
  qty: number
  subtotal: number
}

export interface Payment {
  id: string
  order_id: string
  amount: number
  paid_at: string
  kasir_id: string
}

export interface User {
  id: string
  username: string
  password_hash: string
  role: "penjual" | "kasir"
  is_active: boolean
  created_by: string | null
  created_at: string
}

export type OrderWithItems = Order & { order_items: OrderItem[] }

export type OrderStatus = Order["status"]
