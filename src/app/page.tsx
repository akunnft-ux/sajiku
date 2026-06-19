"use client"

import { Suspense, useState, useCallback } from "react"
import { useRouter, useSearchParams } from "next/navigation"
import { createOrder } from "@/features/ordering/actions"
import { getMenuItems } from "@/features/menu/actions"
import { toast } from "sonner"
import { useEffect } from "react"
import type { MenuItem } from "@/types/database"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Card, CardContent } from "@/components/ui/card"
import { Skeleton } from "@/components/ui/skeleton"

export default function MenuPage() {
  return (
    <Suspense fallback={<div className="flex min-h-screen items-center justify-center bg-slate-50"><Skeleton className="h-64 w-full max-w-sm rounded-xl" /></div>}>
      <MenuPageContent />
    </Suspense>
  )
}

function MenuPageContent() {
  const searchParams = useSearchParams()
  const router = useRouter()
  const tableNo = Number(searchParams.get("table")) || 1

  const [menuItems, setMenuItems] = useState<MenuItem[]>([])
  const [loading, setLoading] = useState(true)
  const [customerName, setCustomerName] = useState("")
  const [cart, setCart] = useState<Record<string, number>>({})
  const [activeCategory, setActiveCategory] = useState("Semua")
  const [submitting, setSubmitting] = useState(false)

  async function loadMenu() {
    try {
      const items = await getMenuItems()
      setMenuItems(items)
    } catch {
      toast.error("Gagal memuat menu")
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    loadMenu()
  }, [])

  const addToCart = useCallback(function addToCart(menuId: string) {
    setCart((prev) => ({ ...prev, [menuId]: (prev[menuId] || 0) + 1 }))
  }, [])

  const removeFromCart = useCallback((menuId: string) => {
    setCart((prev) => {
      const next = { ...prev }
      if (next[menuId] <= 1) delete next[menuId]
      else next[menuId]--
      return next
    })
  }, [])

  const categories = [
    "Semua",
    ...new Set(menuItems.map((m) => m.category).filter(Boolean)),
  ] as string[]

  const filteredItems =
    activeCategory === "Semua"
      ? menuItems
      : menuItems.filter((m) => m.category === activeCategory)

  const cartItems = Object.entries(cart)
    .map(([id, qty]) => {
      const item = menuItems.find((m) => m.id === id)
      return item ? { ...item, qty } : null
    })
    .filter(Boolean) as (MenuItem & { qty: number })[]

  const total = cartItems.reduce((sum, item) => sum + item.price * item.qty, 0)
  const cartCount = cartItems.reduce((sum, item) => sum + item.qty, 0)

  async function handleSubmit() {
    if (!customerName.trim()) {
      toast.error("Masukkan nama Anda")
      return
    }
    if (cartItems.length === 0) {
      toast.error("Pilih minimal 1 item")
      return
    }

    setSubmitting(true)
    try {
      const order = await createOrder({
        table_no: tableNo,
        customer_name: customerName.trim(),
        items: cartItems.map((i) => ({ menu_id: i.id, qty: i.qty })),
        notes: "",
      })
      router.push(`/order/${order.id}`)
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Gagal membuat pesanan")
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <div className="min-h-screen bg-slate-50">
      <div className="mx-auto max-w-lg px-4 py-4">
        {/* Header */}
        <div className="mb-4 flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-slate-800">🍜 Sajiku</h1>
            <p className="text-sm text-slate-500">Meja {tableNo}</p>
          </div>
          {cartCount > 0 && (
            <div className="rounded-lg bg-orange-50 px-3 py-1.5">
              <span className="font-semibold text-orange-600">
                🛒 {cartCount}
              </span>
            </div>
          )}
        </div>

        {/* Category Filters */}
        <div className="mb-4 flex gap-2 overflow-x-auto pb-2">
          {categories.map((cat) => (
            <button
              key={cat}
              onClick={() => setActiveCategory(cat)}
              className={`whitespace-nowrap rounded-full px-4 py-1.5 text-sm font-medium transition-colors ${
                activeCategory === cat
                  ? "bg-orange-600 text-white"
                  : "bg-white text-slate-600 border border-slate-200"
              }`}
            >
              {cat}
            </button>
          ))}
        </div>

        {/* Menu Grid */}
        {loading ? (
          <div className="grid grid-cols-2 gap-3">
            {Array.from({ length: 6 }).map((_, i) => (
              <Card key={i}>
                <CardContent className="p-3">
                  <Skeleton className="mb-2 h-20 w-full rounded-lg" />
                  <Skeleton className="mb-1 h-4 w-3/4" />
                  <Skeleton className="mb-2 h-4 w-1/2" />
                  <Skeleton className="h-8 w-full" />
                </CardContent>
              </Card>
            ))}
          </div>
        ) : filteredItems.length === 0 ? (
          <div className="py-12 text-center text-slate-400">
            <p className="text-lg">Menu masih kosong</p>
            <p className="text-sm">Nanti lagi ya!</p>
          </div>
        ) : (
          <div className="grid grid-cols-2 gap-3">
            {filteredItems.map((item) => (
              <Card key={item.id}>
                <CardContent className="p-3">
                  <div className="mb-2 flex h-20 items-center justify-center rounded-lg bg-orange-50">
                    <span className="text-3xl">🍽️</span>
                  </div>
                  <h3 className="text-sm font-semibold text-slate-800">
                    {item.name}
                  </h3>
                  <p className="mb-2 text-sm font-semibold text-orange-600">
                    Rp {item.price.toLocaleString()}
                  </p>
                  {cart[item.id] ? (
                    <div className="flex items-center gap-2">
                      <Button
                        variant="outline"
                        size="icon"
                        className="h-8 w-8"
                        onClick={() => removeFromCart(item.id)}
                      >
                        -
                      </Button>
                      <span className="w-6 text-center text-sm font-medium">
                        {cart[item.id]}
                      </span>
                      <Button
                        size="icon"
                        className="h-8 w-8 bg-orange-600 hover:bg-orange-700"
                        onClick={() => addToCart(item.id)}
                      >
                        +
                      </Button>
                    </div>
                  ) : (
                    <Button
                      size="sm"
                      className="w-full bg-orange-600 hover:bg-orange-700"
                      onClick={() => addToCart(item.id)}
                    >
                      + Tambah
                    </Button>
                  )}
                </CardContent>
              </Card>
            ))}
          </div>
        )}

        {/* Order Form */}
        <div className="mt-6 rounded-xl border bg-white p-4 shadow-sm">
          <Input
            placeholder="Nama Anda"
            value={customerName}
            onChange={(e) => setCustomerName(e.target.value)}
            className="mb-3"
            maxLength={50}
          />

          {cartItems.length > 0 && (
            <div className="mb-3 space-y-1.5">
              {cartItems.map((item) => (
                <div
                  key={item.id}
                  className="flex items-center justify-between text-sm"
                >
                  <span>
                    {item.qty}x {item.name}
                  </span>
                  <span className="font-medium">
                    Rp {(item.price * item.qty).toLocaleString()}
                  </span>
                </div>
              ))}
              <div className="border-t pt-1.5 text-base font-bold">
                <div className="flex justify-between">
                  <span>Total</span>
                  <span className="text-orange-600">
                    Rp {total.toLocaleString()}
                  </span>
                </div>
              </div>
            </div>
          )}

          <Button
            className="w-full bg-orange-600 py-6 text-base hover:bg-orange-700"
            disabled={cartCount === 0 || !customerName.trim() || submitting}
            onClick={handleSubmit}
          >
            {submitting ? "Mengirim..." : "✨ Pesan"}
          </Button>
        </div>
      </div>
    </div>
  )
}
