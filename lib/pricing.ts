export type Zone = "TANA" | "PERI" | "SUPER"

interface PricingParams {
  zone: Zone
  weightKg: number
  isExpress: boolean
}

const BASE_PRICES: Record<Zone, { light: number; heavy: number }> = {
  TANA: { light: 3000, heavy: 3000 },
  PERI: { light: 3000, heavy: 4000 },
  SUPER: { light: 4000, heavy: 4000 },
}

const EXPRESS_SURCHARGE: Record<Zone, number> = {
  TANA: 2000,
  PERI: 3000,
  SUPER: 6000,
}

export function computePrice({ zone, weightKg, isExpress }: PricingParams): number {
  // Validation: ensure zone is valid, default to TANA if not
  const validZone: Zone = zone && (zone === "TANA" || zone === "PERI" || zone === "SUPER") 
    ? zone 
    : "TANA"
  
  if (validZone !== zone) {
    console.warn(`⚠️ Zone invalide: "${zone}", utilisation de "TANA" par défaut`)
  }

  let basePrice = 0

  // Weight-based pricing
  if (weightKg <= 2) {
    basePrice = BASE_PRICES[validZone].light
  } else if (weightKg <= 5) {
    basePrice = BASE_PRICES[validZone].light + BASE_PRICES[validZone].heavy
  } else {
    // For weights > 5kg, add additional charges per kg
    const extraKg = Math.ceil(weightKg - 5)
    basePrice = BASE_PRICES[validZone].light + BASE_PRICES[validZone].heavy + extraKg * 1000
  }

  // Add express surcharge if applicable
  if (isExpress) {
    basePrice += EXPRESS_SURCHARGE[validZone]
  }

  return basePrice
}
