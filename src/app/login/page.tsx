"use client"

import { useState } from "react"
import Link from "next/link"
import { login } from "@/features/auth/actions"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Card, CardContent } from "@/components/ui/card"
import { toast } from "sonner"

export default function LoginPage() {
  const [loading, setLoading] = useState(false)

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault()
    setLoading(true)
    try {
      await login(new FormData(e.currentTarget))
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Login gagal")
      setLoading(false)
    }
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-slate-50 p-4">
      <Card className="w-full max-w-sm">
        <CardContent className="p-6">
          <div className="mb-6 text-center">
            <h1 className="text-3xl font-bold text-slate-800">🍜 Sajiku</h1>
            <p className="text-sm text-slate-500">UMKM Ordering System</p>
          </div>

          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="mb-1 block text-sm font-medium text-slate-700">
                Username
              </label>
              <Input name="username" required placeholder="Masukkan username" />
            </div>
            <div>
              <label className="mb-1 block text-sm font-medium text-slate-700">
                Password
              </label>
              <Input
                name="password"
                type="password"
                required
                placeholder="Masukkan password"
              />
            </div>
            <Button
              type="submit"
              className="w-full bg-orange-600 hover:bg-orange-700"
              disabled={loading}
            >
              {loading ? "Memproses..." : "Masuk"}
            </Button>
          </form>

          <Link
            href="/"
            className="mt-4 block text-center text-sm text-orange-600 hover:underline"
          >
            Pesan dari meja? &rarr; Ke Menu Makanan
          </Link>
        </CardContent>
      </Card>
    </div>
  )
}
