import { z } from "zod"

export const clientSchema = z.object({
  name: z.string().min(2, "Le nom doit contenir au moins 2 caractères"),
  phone: z.string().min(5, "Le téléphone doit contenir au moins 5 caractères"),
  pickupAddress: z.string().min(5, "L'adresse doit contenir au moins 5 caractères"),
  pickupZone: z.enum(["TANA_VILLE", "PERIPHERIE", "SUPER_PERIPHERIE"], {
    required_error: "Veuillez sélectionner une zone de récupération",
  }),
  note: z.string().optional(),
})

export type ClientFormData = z.infer<typeof clientSchema>
