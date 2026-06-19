"use client"

import { useState } from "react"
import { getDailyReport, getMenuReport, getOrderHistory } from "@/features/reports/queries"
import { Input } from "@/components/ui/input"
import { Skeleton } from "@/components/ui/skeleton"
import { toast } from "sonner"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import type { Order } from "@/types/database"

interface DailyReport {
  total_orders: number
  total_revenue: number
  avg_order_value: number
}

interface MenuReportItem {
  menu_name: string
  qty: number
  total: number
}

const today = new Date().toISOString().split("T")[0]

export default function ReportsPage() {
  const [fromDate, setFromDate] = useState(today)
  const [toDate, setToDate] = useState(today)
  const [dailyData, setDailyData] = useState<DailyReport | null>(null)
  const [menuData, setMenuData] = useState<MenuReportItem[]>([])
  const [historyData, setHistoryData] = useState<Order[]>([])
  const [loading, setLoading] = useState(false)

  async function loadDaily() {
    setLoading(true)
    try {
      const data = await getDailyReport(fromDate, toDate)
      setDailyData(data)
    } catch {
      toast.error("Gagal memuat laporan")
    } finally {
      setLoading(false)
    }
  }

  async function loadMenu() {
    setLoading(true)
    try {
      const data = await getMenuReport(fromDate, toDate)
      setMenuData(data)
    } catch {
      toast.error("Gagal memuat laporan menu")
    } finally {
      setLoading(false)
    }
  }

  async function loadHistory() {
    setLoading(true)
    try {
      const data = await getOrderHistory("semua", fromDate, toDate)
      setHistoryData(data)
    } catch {
      toast.error("Gagal memuat riwayat")
    } finally {
      setLoading(false)
    }
  }

  return (
    <div>
      <h1 className="mb-4 text-2xl font-bold text-slate-800">Laporan</h1>

      {/* Date Filter */}
      <div className="mb-4 flex items-end gap-3 rounded-xl border bg-white p-4">
        <div>
          <label className="mb-1 block text-xs font-medium text-slate-500">
            Dari
          </label>
          <Input
            type="date"
            value={fromDate}
            onChange={(e) => setFromDate(e.target.value)}
            className="h-9"
          />
        </div>
        <div>
          <label className="mb-1 block text-xs font-medium text-slate-500">
            Sampai
          </label>
          <Input
            type="date"
            value={toDate}
            onChange={(e) => setToDate(e.target.value)}
            className="h-9"
          />
        </div>
      </div>

      <Tabs defaultValue="daily" className="space-y-4">
        <TabsList>
          <TabsTrigger value="daily" onClick={loadDaily}>
            Per Hari
          </TabsTrigger>
          <TabsTrigger value="menu" onClick={loadMenu}>
            Per Menu
          </TabsTrigger>
          <TabsTrigger value="history" onClick={loadHistory}>
            Riwayat
          </TabsTrigger>
        </TabsList>

        <TabsContent value="daily">
          {loading ? (
            <div className="grid grid-cols-3 gap-4">
              {Array.from({ length: 3 }).map((_, i) => (
                <Skeleton key={i} className="h-24 rounded-xl" />
              ))}
            </div>
          ) : dailyData ? (
            <div>
              <div className="mb-4 grid grid-cols-3 gap-4">
                <div className="rounded-xl border bg-white p-4">
                  <p className="text-xs text-slate-500">Total Pendapatan</p>
                  <p className="text-2xl font-bold text-green-600">
                    Rp {dailyData.total_revenue.toLocaleString()}
                  </p>
                </div>
                <div className="rounded-xl border bg-white p-4">
                  <p className="text-xs text-slate-500">Total Pesanan</p>
                  <p className="text-2xl font-bold text-slate-800">
                    {dailyData.total_orders}
                  </p>
                </div>
                <div className="rounded-xl border bg-white p-4">
                  <p className="text-xs text-slate-500">Rata-rata</p>
                  <p className="text-2xl font-bold text-orange-600">
                    Rp {dailyData.avg_order_value.toLocaleString()}
                  </p>
                </div>
              </div>
            </div>
          ) : (
            <p className="py-8 text-center text-slate-400">
              Pilih tanggal dan klik tab untuk melihat laporan
            </p>
          )}
        </TabsContent>

        <TabsContent value="menu">
          {loading ? (
            <Skeleton className="h-48 w-full rounded-xl" />
          ) : menuData.length > 0 ? (
            <div className="overflow-hidden rounded-xl border bg-white">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b bg-slate-50 text-left text-xs font-semibold text-slate-500">
                    <th className="px-4 py-3">Menu</th>
                    <th className="px-4 py-3">Terjual</th>
                    <th className="px-4 py-3 text-right">Total</th>
                  </tr>
                </thead>
                <tbody>
                  {menuData.map((item, i) => (
                    <tr key={i} className="border-b last:border-0">
                      <td className="px-4 py-3 font-medium text-slate-800">
                        {item.menu_name}
                      </td>
                      <td className="px-4 py-3">{item.qty}</td>
                      <td className="px-4 py-3 text-right font-medium">
                        Rp {item.total.toLocaleString()}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ) : (
            <p className="py-8 text-center text-slate-400">
              Belum ada data penjualan untuk periode ini
            </p>
          )}
        </TabsContent>

        <TabsContent value="history">
          {loading ? (
            <Skeleton className="h-48 w-full rounded-xl" />
          ) : historyData.length > 0 ? (
            <div className="overflow-hidden rounded-xl border bg-white">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b bg-slate-50 text-left text-xs font-semibold text-slate-500">
                    <th className="px-4 py-3">Waktu</th>
                    <th className="px-4 py-3">Meja</th>
                    <th className="px-4 py-3">Pelanggan</th>
                    <th className="px-4 py-3">Total</th>
                    <th className="px-4 py-3">Status</th>
                  </tr>
                </thead>
                <tbody>
                  {historyData.map((order) => (
                    <tr key={order.id} className="border-b last:border-0">
                      <td className="px-4 py-3 text-slate-500">
                        {new Date(order.created_at).toLocaleString("id-ID", {
                          hour: "2-digit",
                          minute: "2-digit",
                          day: "numeric",
                          month: "short",
                        })}
                      </td>
                      <td className="px-4 py-3 font-medium">
                        Meja {order.table_no}
                      </td>
                      <td className="px-4 py-3 text-slate-600">
                        {order.customer_name}
                      </td>
                      <td className="px-4 py-3 font-medium">
                        Rp {order.total.toLocaleString()}
                      </td>
                      <td className="px-4 py-3">
                        <span
                          className={`rounded-full px-2 py-0.5 text-xs font-medium ${
                            order.status === "Dibayar"
                              ? "bg-green-100 text-green-700"
                              : order.status === "Dibatalkan"
                                ? "bg-red-100 text-red-700"
                                : "bg-amber-100 text-amber-700"
                          }`}
                        >
                          {order.status}
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ) : (
            <p className="py-8 text-center text-slate-400">
              Belum ada riwayat pesanan
            </p>
          )}
        </TabsContent>
      </Tabs>
    </div>
  )
}
