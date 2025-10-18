import { z } from "zod"

export const deliverySchema = z.object({
  plannedDate: z.string().refine((date) => new Date(date) >= new Date(new Date().setHours(0, 0, 0, 0)), {
    message: "La date planifiée doit être aujourd'hui ou dans le futur",
  }),
  senderId: z.string().min(1, "Le client expéditeur est requis"),
  receiverName: z.string().min(2, "Le nom du récepteur doit contenir au moins 2 caractères"),
  receiverPhone: z.string().min(5, "Le téléphone du récepteur doit contenir au moins 5 caractères"),
  receiverAddress: z.string().min(5, "L'adresse du récepteur doit contenir au moins 5 caractères"),
  parcelCount: z.number().int().min(1, "Le nombre de colis doit être au moins 1"),
  weightKg: z.number().min(0.1, "Le poids doit être au moins 0.1 kg"),
  description: z.string().optional(),
  note: z.string().optional(),
  zone: z.enum(["TANA", "PERI", "SUPER"], { required_error: "La zone est requise" }),
  isExpress: z.boolean(),
  deliveryPrice: z.number().int().min(0, "Le prix de livraison doit être positif"),
  collectAmount: z.number().int().min(0).optional(),
  isPrepaid: z.boolean().optional(),
  deliveryFeePrepaid: z.boolean().optional(),
  courierId: z.string().optional(),
})

export type DeliveryFormData = z.infer<typeof deliverySchema>
