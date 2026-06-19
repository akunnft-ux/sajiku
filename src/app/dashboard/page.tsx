"use client"

import { useEffect, useState, useCallback } from "react"
import { getOrders, acceptOrder, markOrderReady, cancelOrder as cancelOrderAction } from "@/features/ordering/actions"
import { createClient } from "@/lib/supabase/client"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Skeleton } from "@/components/ui/skeleton"
import { toast } from "sonner"
import type { Order, OrderItem } from "@/types/database"

type OrderWithItems = Order & { order_items: OrderItem[] }

const STATUS_COLORS: Record<string, string> = {
  Baru: "bg-blue-100 text-blue-700",
  Diproses: "bg-amber-100 text-amber-700",
  Siap: "bg-green-100 text-green-700",
  Dibayar: "bg-slate-100 text-slate-500",
  Dibatalkan: "bg-red-100 text-red-700",
}

const TABS = ["Semua", "Baru", "Diproses", "Siap"]

export default function DashboardOrdersPage() {
  const [orders, setOrders] = useState<OrderWithItems[]>([])
  const [loading, setLoading] = useState(true)
  const [activeTab, setActiveTab] = useState("Semua")

  const fetchOrders = useCallback(async () => {
    try {
      const data = await getOrders(
        activeTab === "Semua" ? undefined : activeTab
      )
      setOrders(data as unknown as OrderWithItems[])
    } catch {
      toast.error("Gagal memuat pesanan")
    } finally {
      setLoading(false)
    }
  }, [activeTab])

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    fetchOrders()
  }, [fetchOrders])

  // Realtime subscription
  useEffect(() => {
    const supabase = createClient()
    const channel = supabase
      .channel("dashboard-orders")
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "orders" },
        () => fetchOrders()
      )
      .subscribe()

    // Poll fallback every 10s
    const interval = setInterval(fetchOrders, 10000)

    return () => {
      supabase.removeChannel(channel)
      clearInterval(interval)
    }
  }, [fetchOrders])

  async function handleAccept(orderId: string) {
    try {
      await acceptOrder(orderId)
      toast.success("Pesanan diterima")
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Gagal")
    }
  }

  async function handleReady(orderId: string) {
    try {
      await markOrderReady(orderId)
      toast.success("Pesanan siap")
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Gagal")
    }
  }

  async function handleCancel(orderId: string) {
    const reason = prompt("Alasan pembatalan:")
    if (!reason) return
    try {
      await cancelOrderAction(orderId, reason)
      toast.success("Pesanan dibatalkan")
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Gagal")
    }
  }

  return (
    <div>
      <div className="mb-4 flex items-center justify-between">
        <h1 className="text-2xl font-bold text-slate-800">Pesanan Masuk</h1>
      </div>

      {/* Tabs */}
      <div className="mb-4 flex gap-2">
        {TABS.map((tab) => (
          <button
            key={tab}
            onClick={() => setActiveTab(tab)}
            className={`rounded-full px-4 py-1.5 text-sm font-medium transition-colors ${
              activeTab === tab
                ? "bg-orange-600 text-white"
                : "border bg-white text-slate-600"
            }`}
          >
            {tab}
          </button>
        ))}
      </div>

      {/* Orders */}
      {loading ? (
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {Array.from({ length: 3 }).map((_, i) => (
            <Skeleton key={i} className="h-48 w-full rounded-xl" />
          ))}
        </div>
      ) : orders.length === 0 ? (
        <div className="py-12 text-center text-slate-400">
          <p className="text-lg">Belum ada pesanan</p>
          <p className="text-sm">Scan QR untuk mulai memesan</p>
        </div>
      ) : (
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {orders.map((order) => (
            <div
              key={order.id}
              className="rounded-xl border bg-white p-4 shadow-sm transition-shadow hover:shadow-md"
            >
              <div className="mb-2 flex items-start justify-between">
                <div>
                  <span className="text-lg font-bold text-slate-800">
                    Meja {order.table_no}
                  </span>
                  <p className="text-xs text-slate-400">
                    {new Date(order.created_at).toLocaleTimeString("id-ID", {
                      hour: "2-digit",
                      minute: "2-digit",
                    })}
                  </p>
                </div>
                <Badge className={STATUS_COLORS[order.status]}>
                  {order.status}
                </Badge>
              </div>

              <p className="mb-1 text-sm font-medium text-slate-700">
                {order.customer_name}
              </p>
              <p className="mb-3 text-xs text-slate-500">
                {order.order_items
                  ?.map((i) => `${i.qty}x ${i.menu_name}`)
                  .join(", ") || "-"}
              </p>

              <div className="mb-3 flex items-center justify-between border-t pt-2">
                <span className="text-sm text-slate-500">Total</span>
                <span className="font-bold text-orange-600">
                  Rp {order.total.toLocaleString()}
                </span>
              </div>

              <div className="flex gap-2">
                {order.status === "Baru" && (
                  <>
                    <Button
                      size="sm"
                      className="flex-1 bg-orange-600 hover:bg-orange-700"
                      onClick={() => handleAccept(order.id)}
                    >
                      Terima
                    </Button>
                    <Button
                      size="sm"
                      variant="outline"
                      className="flex-1"
                      onClick={() => handleCancel(order.id)}
                    >
                      Batal
                    </Button>
                  </>
                )}
                {order.status === "Diproses" && (
                  <>
                    <Button
                      size="sm"
                      className="flex-1 bg-green-600 hover:bg-green-700"
                      onClick={() => handleReady(order.id)}
                    >
                      Siap ✅
                    </Button>
                    <Button
                      size="sm"
                      variant="outline"
                      className="flex-1 border-red-200 text-red-500"
                      onClick={() => handleCancel(order.id)}
                    >
                      Batal
                    </Button>
                  </>
                )}
                {order.status === "Siap" && (
                  <Badge className="w-full justify-center bg-green-100 py-2 text-green-700">
                    ✅ Menunggu Pembayaran
                  </Badge>
                )}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
