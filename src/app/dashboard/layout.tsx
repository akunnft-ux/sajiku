"use client"

import Link from "next/link"
import { usePathname } from "next/navigation"
import { logout } from "@/features/auth/actions"
import { Button } from "@/components/ui/button"
import { ROLES } from "@/lib/constants"

const NAV_ITEMS = [
  { href: "/dashboard", label: "📋 Pesanan", roles: [ROLES.PENJUAL] },
  { href: "/dashboard/menu", label: "📦 Menu", roles: [ROLES.PENJUAL] },
  { href: "/dashboard/kasir", label: "👤 Kasir", roles: [ROLES.PENJUAL] },
  { href: "/dashboard/reports", label: "📊 Laporan", roles: [ROLES.PENJUAL] },
  { href: "/dashboard/kasir-panel", label: "💳 Pembayaran", roles: [ROLES.KASIR] },
]

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode
}) {
  const pathname = usePathname()

  return (
    <div className="flex min-h-screen bg-slate-50">
      {/* Sidebar */}
      <aside className="hidden w-56 flex-shrink-0 border-r bg-white md:block">
        <div className="p-4">
          <Link href="/dashboard" className="text-xl font-bold text-slate-800">
            🍜 Sajiku
          </Link>
        </div>
        <nav className="space-y-1 px-3">
          {NAV_ITEMS.map((item) => (
            <Link
              key={item.href}
              href={item.href}
              className={`flex items-center gap-3 rounded-lg px-3 py-2 text-sm transition-colors ${
                pathname === item.href
                  ? "bg-orange-50 font-semibold text-orange-600"
                  : "text-slate-600 hover:bg-slate-100"
              }`}
            >
              {item.label}
            </Link>
          ))}
        </nav>
        <div className="border-t p-4">
          <form action={logout}>
            <Button
              variant="ghost"
              type="submit"
              className="w-full justify-start text-slate-500"
            >
              🚪 Keluar
            </Button>
          </form>
        </div>
      </aside>

      {/* Main */}
      <div className="flex flex-1 flex-col">
        {/* Mobile Header */}
        <header className="flex items-center justify-between border-b bg-white px-4 py-3 md:hidden">
          <Link href="/dashboard" className="text-lg font-bold text-slate-800">
            🍜 Sajiku
          </Link>
          <form action={logout}>
            <Button variant="ghost" size="sm" type="submit">
              Keluar
            </Button>
          </form>
        </header>

        <main className="flex-1 p-4 md:p-6">{children}</main>

        {/* Mobile Bottom Nav */}
        <nav className="flex border-t bg-white md:hidden">
          {NAV_ITEMS.map((item) => (
            <Link
              key={item.href}
              href={item.href}
              className={`flex flex-1 flex-col items-center py-2 text-xs ${
                pathname === item.href
                  ? "text-orange-600"
                  : "text-slate-400"
              }`}
            >
              {item.label.split(" ")[0]}
              <span>{item.label.split(" ").slice(1).join(" ")}</span>
            </Link>
          ))}
        </nav>
      </div>
    </div>
  )
}
