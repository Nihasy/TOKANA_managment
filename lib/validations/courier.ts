import { z } from "zod"

export const courierSchema = z.object({
  email: z.string().email("Email invalide"),
  name: z.string().min(2, "Le nom doit contenir au moins 2 caractères"),
  phone: z.string().optional(),
  password: z.string().min(6, "Le mot de passe doit contenir au moins 6 caractères"),
  role: z.literal("COURIER"),
})

export const courierUpdateSchema = z.object({
  email: z.string().email("Email invalide"),
  name: z.string().min(2, "Le nom doit contenir au moins 2 caractères"),
  phone: z.string().optional(),
  password: z.string().min(6, "Le mot de passe doit contenir au moins 6 caractères").optional(),
})

export type CourierFormData = z.infer<typeof courierSchema>
export type CourierUpdateData = z.infer<typeof courierUpdateSchema>
