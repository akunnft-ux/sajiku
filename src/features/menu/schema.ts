import { z } from "zod"

export const menuItemSchema = z.object({
  name: z.string().min(1, "Nama menu wajib diisi").max(100),
  price: z.coerce.number().int().positive("Harga harus lebih dari 0"),
  category: z.string().max(50).optional().default(""),
  is_available: z.boolean().default(true),
})

export type MenuItemInput = z.infer<typeof menuItemSchema>
