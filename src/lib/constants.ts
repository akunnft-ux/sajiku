export const APP_NAME = "Sajiku"
export const ORDER_STATUS = {
  BARU: "Baru",
  DIPROSES: "Diproses",
  SIAP: "Siap",
  DIBAYAR: "Dibayar",
  DIBATALKAN: "Dibatalkan",
} as const

export type OrderStatus = (typeof ORDER_STATUS)[keyof typeof ORDER_STATUS]

export const ROLES = {
  PENJUAL: "penjual",
  KASIR: "kasir",
} as const

export type Role = (typeof ROLES)[keyof typeof ROLES]
