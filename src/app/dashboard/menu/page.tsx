"use client"

import { useEffect, useState } from "react"
import {
  getMenuItems,
  createMenuItem,
  updateMenuItem,
  toggleMenuItemAvailability,
} from "@/features/menu/actions"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { Skeleton } from "@/components/ui/skeleton"
import { toast } from "sonner"
import type { MenuItem } from "@/types/database"

const CATEGORIES = ["Makanan", "Minuman", "Camilan"]

export default function MenuManagementPage() {
  const [items, setItems] = useState<MenuItem[]>([])
  const [loading, setLoading] = useState(true)
  const [formOpen, setFormOpen] = useState(false)
  const [editing, setEditing] = useState<MenuItem | null>(null)
  const [formName, setFormName] = useState("")
  const [formPrice, setFormPrice] = useState("")
  const [formCategory, setFormCategory] = useState("")
  const [submitting, setSubmitting] = useState(false)

  useEffect(() => {
    loadItems()
  }, [])

  async function loadItems() {
    try {
      const data = await getMenuItems(true)
      setItems(data)
    } catch {
      toast.error("Gagal memuat menu")
    } finally {
      setLoading(false)
    }
  }

  function openCreate() {
    setEditing(null)
    setFormName("")
    setFormPrice("")
    setFormCategory("")
    setFormOpen(true)
  }

  function openEdit(item: MenuItem) {
    setEditing(item)
    setFormName(item.name)
    setFormPrice(String(item.price))
    setFormCategory(item.category || "")
    setFormOpen(true)
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setSubmitting(true)
    try {
      if (editing) {
        await updateMenuItem(editing.id, {
          name: formName,
          price: Number(formPrice),
          category: formCategory,
          is_available: editing.is_available,
        })
        toast.success("Menu diupdate")
      } else {
        await createMenuItem({
          name: formName,
          price: Number(formPrice),
          category: formCategory,
          is_available: true,
        })
        toast.success("Menu ditambahkan")
      }
      setFormOpen(false)
      loadItems()
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Gagal")
    } finally {
      setSubmitting(false)
    }
  }

  async function handleToggle(item: MenuItem) {
    try {
      await toggleMenuItemAvailability(item.id)
      toast.success(
        item.is_available ? "Menu dinonaktifkan" : "Menu diaktifkan"
      )
      loadItems()
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Gagal")
    }
  }

  return (
    <div>
      <div className="mb-4 flex items-center justify-between">
        <h1 className="text-2xl font-bold text-slate-800">Daftar Menu</h1>
        <Button
          className="bg-orange-600 hover:bg-orange-700"
          onClick={openCreate}
        >
          + Tambah Menu
        </Button>
      </div>

      {loading ? (
        <div className="space-y-2">
          {Array.from({ length: 5 }).map((_, i) => (
            <Skeleton key={i} className="h-12 w-full" />
          ))}
        </div>
      ) : (
        <div className="overflow-hidden rounded-xl border bg-white">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b bg-slate-50 text-left text-xs font-semibold text-slate-500">
                <th className="px-4 py-3">#</th>
                <th className="px-4 py-3">Nama</th>
                <th className="px-4 py-3">Kategori</th>
                <th className="px-4 py-3">Harga</th>
                <th className="px-4 py-3">Status</th>
                <th className="px-4 py-3 text-right">Aksi</th>
              </tr>
            </thead>
            <tbody>
              {items.map((item, i) => (
                <tr key={item.id} className="border-b last:border-0">
                  <td className="px-4 py-3 text-slate-400">{i + 1}</td>
                  <td className="px-4 py-3 font-medium text-slate-800">
                    {item.name}
                  </td>
                  <td className="px-4 py-3 text-slate-500">
                    {item.category || "-"}
                  </td>
                  <td className="px-4 py-3">
                    Rp {item.price.toLocaleString()}
                  </td>
                  <td className="px-4 py-3">
                    <button
                      onClick={() => handleToggle(item)}
                      className={`rounded-full px-2 py-0.5 text-xs font-medium ${
                        item.is_available
                          ? "bg-green-100 text-green-700"
                          : "bg-red-100 text-red-700"
                      }`}
                    >
                      {item.is_available ? "Tersedia" : "Habis"}
                    </button>
                  </td>
                  <td className="px-4 py-3 text-right">
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => openEdit(item)}
                    >
                      ✏️
                    </Button>
                  </td>
                </tr>
              ))}
              {items.length === 0 && (
                <tr>
                  <td colSpan={6} className="px-4 py-8 text-center text-slate-400">
                    Belum ada menu. Tambahkan menu sekarang!
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      )}

      <Dialog open={formOpen} onOpenChange={setFormOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>
              {editing ? "Edit Menu" : "Tambah Menu"}
            </DialogTitle>
          </DialogHeader>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="mb-1 block text-sm font-medium text-slate-700">
                Nama
              </label>
              <Input
                value={formName}
                onChange={(e) => setFormName(e.target.value)}
                required
                placeholder="Nama menu"
              />
            </div>
            <div>
              <label className="mb-1 block text-sm font-medium text-slate-700">
                Harga (Rp)
              </label>
              <Input
                type="number"
                value={formPrice}
                onChange={(e) => setFormPrice(e.target.value)}
                required
                min={1}
                placeholder="15000"
              />
            </div>
            <div>
              <label className="mb-1 block text-sm font-medium text-slate-700">
                Kategori
              </label>
              <Select value={formCategory} onValueChange={(val) => setFormCategory(val || "")}>
                <SelectTrigger>
                  <SelectValue placeholder="Pilih kategori" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="">Tidak ada</SelectItem>
                  {CATEGORIES.map((cat) => (
                    <SelectItem key={cat} value={cat}>
                      {cat}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="flex justify-end gap-2">
              <Button
                type="button"
                variant="outline"
                onClick={() => setFormOpen(false)}
              >
                Batal
              </Button>
              <Button
                type="submit"
                className="bg-orange-600 hover:bg-orange-700"
                disabled={submitting}
              >
                {submitting ? "Menyimpan..." : "Simpan"}
              </Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  )
}
