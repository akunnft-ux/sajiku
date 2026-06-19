import { z } from "zod"

export const createOrderSchema = z.object({
  table_no: z.coerce.number().int().positive(),
  customer_name: z.string().min(1, "Nama wajib diisi").max(50),
  items: z
    .array(
      z.object({
        menu_id: z.string().uuid(),
        qty: z.coerce.number().int().min(1),
      })
    )
    .min(1, "Minimal 1 item"),
  notes: z.string().max(200).optional().default(""),
})

export type CreateOrderInput = z.infer<typeof createOrderSchema>
