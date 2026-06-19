"use client"

import { useEffect, useState } from "react"
import {
  getKasirList,
  createKasir,
  toggleKasirActive,
} from "@/features/users/actions"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { Skeleton } from "@/components/ui/skeleton"
import { toast } from "sonner"

interface KasirUser {
  id: string
  username: string
  is_active: boolean
  created_at: string
}

export default function KasirManagementPage() {
  const [kasirs, setKasirs] = useState<KasirUser[]>([])
  const [loading, setLoading] = useState(true)
  const [formOpen, setFormOpen] = useState(false)
  const [username, setUsername] = useState("")
  const [password, setPassword] = useState("")
  const [submitting, setSubmitting] = useState(false)

  useEffect(() => {
    loadKasirs()
  }, [])

  async function loadKasirs() {
    try {
      const data = await getKasirList()
      setKasirs(data as unknown as KasirUser[])
    } catch {
      toast.error("Gagal memuat data kasir")
    } finally {
      setLoading(false)
    }
  }

  async function handleCreate(e: React.FormEvent) {
    e.preventDefault()
    setSubmitting(true)
    try {
      await createKasir({ username, password })
      toast.success("Kasir ditambahkan")
      setFormOpen(false)
      setUsername("")
      setPassword("")
      loadKasirs()
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Gagal")
    } finally {
      setSubmitting(false)
    }
  }

  async function handleToggle(id: string, currentActive: boolean) {
    try {
      await toggleKasirActive(id)
      toast.success(
        currentActive ? "Kasir dinonaktifkan" : "Kasir diaktifkan"
      )
      loadKasirs()
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Gagal")
    }
  }

  return (
    <div>
      <div className="mb-4 flex items-center justify-between">
        <h1 className="text-2xl font-bold text-slate-800">Kelola Kasir</h1>
        <Button
          className="bg-orange-600 hover:bg-orange-700"
          onClick={() => setFormOpen(true)}
        >
          + Tambah Kasir
        </Button>
      </div>

      {loading ? (
        <div className="space-y-2">
          {Array.from({ length: 3 }).map((_, i) => (
            <Skeleton key={i} className="h-12 w-full" />
          ))}
        </div>
      ) : (
        <div className="overflow-hidden rounded-xl border bg-white">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b bg-slate-50 text-left text-xs font-semibold text-slate-500">
                <th className="px-4 py-3">#</th>
                <th className="px-4 py-3">Username</th>
                <th className="px-4 py-3">Dibuat</th>
                <th className="px-4 py-3">Status</th>
                <th className="px-4 py-3 text-right">Aksi</th>
              </tr>
            </thead>
            <tbody>
              {kasirs.map((kasir, i) => (
                <tr key={kasir.id} className="border-b last:border-0">
                  <td className="px-4 py-3 text-slate-400">{i + 1}</td>
                  <td className="px-4 py-3 font-medium text-slate-800">
                    {kasir.username}
                  </td>
                  <td className="px-4 py-3 text-slate-500">
                    {new Date(kasir.created_at).toLocaleDateString("id-ID")}
                  </td>
                  <td className="px-4 py-3">
                    <span
                      className={`rounded-full px-2 py-0.5 text-xs font-medium ${
                        kasir.is_active
                          ? "bg-green-100 text-green-700"
                          : "bg-red-100 text-red-700"
                      }`}
                    >
                      {kasir.is_active ? "Aktif" : "Nonaktif"}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-right">
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() =>
                        handleToggle(kasir.id, kasir.is_active)
                      }
                    >
                      {kasir.is_active ? "🔴 Nonaktifkan" : "🟢 Aktifkan"}
                    </Button>
                  </td>
                </tr>
              ))}
              {kasirs.length === 0 && (
                <tr>
                  <td
                    colSpan={5}
                    className="px-4 py-8 text-center text-slate-400"
                  >
                    Belum ada kasir. Tambahkan kasir sekarang!
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
            <DialogTitle>Tambah Kasir</DialogTitle>
          </DialogHeader>
          <form onSubmit={handleCreate} className="space-y-4">
            <div>
              <label className="mb-1 block text-sm font-medium text-slate-700">
                Username
              </label>
              <Input
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                required
                minLength={3}
                placeholder="kasir01"
              />
            </div>
            <div>
              <label className="mb-1 block text-sm font-medium text-slate-700">
                Password
              </label>
              <Input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
                minLength={6}
                placeholder="Min 6 karakter"
              />
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
