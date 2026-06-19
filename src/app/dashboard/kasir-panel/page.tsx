"use client"

import { useEffect, useState, useCallback } from "react"
import { getSiapOrders, findOrderByCode, processPayment } from "@/features/payment/actions"
import { createClient } from "@/lib/supabase/client"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Card, CardContent } from "@/components/ui/card"
import { Skeleton } from "@/components/ui/skeleton"
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { toast } from "sonner"
import type { Order, OrderItem } from "@/types/database"

type OrderWithItems = Order & { order_items: OrderItem[] }

export default function KasirPanelPage() {
  const [orders, setOrders] = useState<OrderWithItems[]>([])
  const [loading, setLoading] = useState(true)
  const [searchCode, setSearchCode] = useState("")
  const [foundOrder, setFoundOrder] = useState<OrderWithItems | null>(null)
  const [confirmOpen, setConfirmOpen] = useState(false)
  const [payingOrderId, setPayingOrderId] = useState<string | null>(null)
  const [paying, setPaying] = useState(false)

  const fetchOrders = useCallback(async () => {
    try {
      const data = await getSiapOrders()
      setOrders(data as unknown as OrderWithItems[])
    } catch {
      toast.error("Gagal memuat pesanan")
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    fetchOrders()
  }, [fetchOrders])

  // Realtime subscription
  useEffect(() => {
    const supabase = createClient()
    const channel = supabase
      .channel("kasir-orders")
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "orders" },
        () => fetchOrders()
      )
      .subscribe()

    const interval = setInterval(fetchOrders, 10000)

    return () => {
      supabase.removeChannel(channel)
      clearInterval(interval)
    }
  }, [fetchOrders])

  async function handleSearch() {
    if (!searchCode.trim()) return
    try {
      const order = await findOrderByCode(searchCode.trim())
      if (order) {
        setFoundOrder(order as unknown as OrderWithItems)
      } else {
        toast.error("Kode tidak ditemukan")
        setFoundOrder(null)
      }
    } catch {
      toast.error("Gagal mencari")
    }
  }

  function handlePayClick(orderId: string) {
    setPayingOrderId(orderId)
    setConfirmOpen(true)
  }

  async function confirmPay() {
    if (!payingOrderId) return
    setPaying(true)
    try {
      await processPayment(payingOrderId)
      toast.success("Pembayaran berhasil")
      setConfirmOpen(false)
      setFoundOrder(null)
      setSearchCode("")
      fetchOrders()
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Gagal")
    } finally {
      setPaying(false)
    }
  }

  return (
    <div>
      <h1 className="mb-6 text-2xl font-bold text-slate-800">Pembayaran</h1>

      {/* Search by Code */}
      <div className="mb-6 flex gap-2 rounded-xl border bg-white p-4">
        <Input
          placeholder="Masukkan kode bayar..."
          value={searchCode}
          onChange={(e) => setSearchCode(e.target.value.toUpperCase())}
          onKeyDown={(e) => e.key === "Enter" && handleSearch()}
          className="flex-1"
        />
        <Button
          className="bg-orange-600 hover:bg-orange-700"
          onClick={handleSearch}
        >
          Cari
        </Button>
      </div>

      {/* Found Order */}
      {foundOrder && (
        <div className="mb-6 rounded-xl border-2 border-orange-200 bg-orange-50 p-4">
          <div className="mb-3 text-center">
            <p className="text-lg font-bold text-slate-800">
              Meja {foundOrder.table_no} &middot; {foundOrder.customer_name}
            </p>
            <p className="text-xs text-slate-500">
              Kode: {foundOrder.payment_code}
            </p>
          </div>
          <div className="mb-3 space-y-1">
            {foundOrder.order_items?.map((item) => (
              <div
                key={item.id}
                className="flex justify-between text-sm"
              >
                <span>
                  {item.qty}x {item.menu_name}
                </span>
                <span>Rp {(item.price * item.qty).toLocaleString()}</span>
              </div>
            ))}
          </div>
          <div className="mb-4 border-t pt-2 text-center">
            <span className="text-lg font-bold">
              Total: Rp {foundOrder.total.toLocaleString()}
            </span>
          </div>
          <Button
            className="w-full bg-green-600 py-6 text-base hover:bg-green-700"
            onClick={() => handlePayClick(foundOrder.id)}
          >
            💰 Bayar Tunai
          </Button>
        </div>
      )}

      {/* Pending Orders */}
      <h2 className="mb-3 text-sm font-semibold text-slate-500">
        PESANAN SIAP DIBAYAR
      </h2>

      {loading ? (
        <div className="grid gap-4 md:grid-cols-3">
          {Array.from({ length: 3 }).map((_, i) => (
            <Skeleton key={i} className="h-44 rounded-xl" />
          ))}
        </div>
      ) : orders.length === 0 ? (
        <div className="py-12 text-center text-slate-400">
          <p className="text-lg">Semua pesanan sudah dibayar</p>
          <p className="text-sm">Mantap! 🎉</p>
        </div>
      ) : (
        <div className="grid gap-4 md:grid-cols-3">
          {orders.map((order) => (
            <Card key={order.id}>
              <CardContent className="p-4 text-center">
                <p className="text-lg font-bold text-slate-800">
                  Meja {order.table_no}
                </p>
                <p className="text-sm text-slate-500">{order.customer_name}</p>
                <p className="my-3 text-2xl font-bold text-slate-800">
                  Rp {order.total.toLocaleString()}
                </p>
                <div className="mb-3 inline-block rounded-lg bg-orange-50 px-3 py-1">
                  <span className="font-bold text-orange-600">
                    {order.payment_code}
                  </span>
                </div>
                <Button
                  className="w-full bg-green-600 hover:bg-green-700"
                  onClick={() => handlePayClick(order.id)}
                >
                  💰 Bayar
                </Button>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {/* Confirm Dialog */}
      <Dialog open={confirmOpen} onOpenChange={setConfirmOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Konfirmasi Pembayaran</DialogTitle>
          </DialogHeader>
          <p className="text-sm text-slate-600">
            Bayar pesanan ini dengan tunai?
          </p>
          <div className="flex justify-end gap-2">
            <Button
              variant="outline"
              onClick={() => setConfirmOpen(false)}
            >
              Batal
            </Button>
            <Button
              className="bg-green-600 hover:bg-green-700"
              onClick={confirmPay}
              disabled={paying}
            >
              {paying ? "Memproses..." : "✅ Ya, Bayar"}
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  )
}
