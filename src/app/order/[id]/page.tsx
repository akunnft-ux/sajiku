"use client"

import { useEffect, useState, useCallback } from "react"
import { useParams } from "next/navigation"
import { getOrderById, cancelOrder as cancelOrderAction } from "@/features/ordering/actions"
import { createClient } from "@/lib/supabase/client"
import { Button } from "@/components/ui/button"
import { Skeleton } from "@/components/ui/skeleton"
import { toast } from "sonner"
import type { Order, OrderItem } from "@/types/database"

type OrderWithItems = Order & { order_items: OrderItem[] }

const STATUS_STEPS = ["Baru", "Diproses", "Siap", "Dibayar"]
const STATUS_LABELS: Record<string, string> = {
  Baru: "Pesanan Baru",
  Diproses: "Sedang Disiapkan",
  Siap: "Siap",
  Dibayar: "Selesai",
  Dibatalkan: "Dibatalkan",
}

export default function OrderStatusPage() {
  const params = useParams()
  const orderId = params.id as string

  const [order, setOrder] = useState<OrderWithItems | null>(null)
  const [loading, setLoading] = useState(true)

  const fetchOrder = useCallback(async () => {
    try {
      const data = await getOrderById(orderId)
      setOrder(data as unknown as OrderWithItems)
    } catch {
      // silent
    } finally {
      setLoading(false)
    }
  }, [orderId])

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    fetchOrder()
  }, [fetchOrder])

  // Realtime subscription
  useEffect(() => {
    const supabase = createClient()
    const channel = supabase
      .channel(`order-${orderId}`)
      .on(
        "postgres_changes",
        {
          event: "UPDATE",
          schema: "public",
          table: "orders",
          filter: `id=eq.${orderId}`,
        },
        (payload) => {
          setOrder((prev) =>
            prev ? { ...prev, ...(payload.new as Order) } : prev
          )
        }
      )
      .subscribe()

    // Poll as fallback every 10s
    const interval = setInterval(fetchOrder, 10000)

    return () => {
      supabase.removeChannel(channel)
      clearInterval(interval)
    }
  }, [orderId, fetchOrder])

  async function handleCancel() {
    if (!confirm("Batalkan pesanan ini?")) return
    try {
      await cancelOrderAction(orderId, "Dibatalkan oleh pembeli")
      toast.success("Pesanan dibatalkan")
      fetchOrder()
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Gagal membatalkan")
    }
  }

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-slate-50 p-4">
        <div className="w-full max-w-sm space-y-4">
          <Skeleton className="h-8 w-48 mx-auto" />
          <Skeleton className="h-48 w-full" />
        </div>
      </div>
    )
  }

  if (!order) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-slate-50 p-4">
        <div className="text-center">
          <p className="text-lg text-slate-400">Pesanan tidak ditemukan</p>
          <Button
            variant="link"
            className="text-orange-600"
            onClick={() => (window.location.href = "/")}
          >
            Kembali ke Menu
          </Button>
        </div>
      </div>
    )
  }

  const currentStepIndex = STATUS_STEPS.indexOf(order.status)
  const isCancelled = order.status === "Dibatalkan"

  return (
    <div className="min-h-screen bg-slate-50">
      <div className="mx-auto max-w-sm px-4 py-8 text-center">
        {isCancelled ? (
          <div className="mb-6">
            <span className="text-5xl">❌</span>
            <h1 className="mt-3 text-xl font-bold text-red-600">
              Pesanan Dibatalkan
            </h1>
            {order.cancel_reason && (
              <p className="mt-1 text-sm text-slate-500">
                Alasan: {order.cancel_reason}
              </p>
            )}
          </div>
        ) : order.status === "Dibayar" ? (
          <div className="mb-6">
            <span className="text-5xl">🎉</span>
            <h1 className="mt-3 text-xl font-bold text-green-600">
              Terima Kasih!
            </h1>
            <p className="mt-1 text-sm text-slate-500">
              Selamat menikmati pesanan Anda
            </p>
          </div>
        ) : (
          <>
            <div className="mb-6">
              <span className="text-5xl">🎉</span>
              <h1 className="mt-3 text-xl font-bold text-slate-800">
                Pesanan Terkirim!
              </h1>
              <p className="mt-1 text-sm text-slate-500">
                {order.customer_name} &middot; Meja {order.table_no}
              </p>
            </div>

            {/* Timeline */}
            <div className="mb-6 rounded-xl border bg-white p-4 text-left">
              {STATUS_STEPS.map((status, i) => {
                const isDone = i <= currentStepIndex
                const isActive = i === currentStepIndex
                return (
                  <div key={status} className="flex items-start gap-3 py-2">
                    <div className="mt-0.5">
                      {isDone ? (
                        <span className="text-lg">✅</span>
                      ) : (
                        <div className="h-6 w-6 rounded-full border-2 border-slate-300" />
                      )}
                    </div>
                    <div>
                      <p
                        className={`text-sm font-medium ${
                          isActive
                            ? "text-orange-600"
                            : isDone
                              ? "text-green-600"
                              : "text-slate-400"
                        }`}
                      >
                        {STATUS_LABELS[status]}
                      </p>
                      {isActive && status === "Diproses" && (
                        <p className="text-xs text-slate-400">
                          Pesanan sedang disiapkan...
                        </p>
                      )}
                    </div>
                  </div>
                )
              })}
            </div>

            {/* Payment Code */}
            {order.status === "Siap" && (
              <div className="mb-6 rounded-xl border-2 border-orange-200 bg-orange-50 p-6">
                <p className="mb-1 text-xs text-slate-500">Kode Bayar</p>
                <p className="mb-2 text-3xl font-bold tracking-widest text-orange-600">
                  # {order.payment_code}
                </p>
                <p className="text-xs text-slate-500">
                  Tunjukkan ke kasir saat membayar
                </p>
              </div>
            )}

            {/* Cancel Button */}
            {order.status === "Baru" && (
              <Button
                variant="outline"
                className="w-full border-red-200 text-red-500 hover:bg-red-50"
                onClick={handleCancel}
              >
                Batalkan Pesanan
              </Button>
            )}
          </>
        )}

        {/* Order Summary */}
        <div className="mt-4 rounded-xl border bg-white p-4 text-left">
          <p className="mb-2 text-sm font-semibold text-slate-600">Pesanan</p>
          {order.order_items?.map((item) => (
            <div
              key={item.id}
              className="flex justify-between py-1 text-sm"
            >
              <span>
                {item.qty}x {item.menu_name}
              </span>
              <span className="font-medium">
                Rp {(item.price * item.qty).toLocaleString()}
              </span>
            </div>
          ))}
          <div className="mt-2 border-t pt-2 text-base font-bold">
            <div className="flex justify-between">
              <span>Total</span>
              <span className="text-orange-600">
                Rp {order.total.toLocaleString()}
              </span>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
