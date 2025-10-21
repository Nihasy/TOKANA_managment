export type Zone = "TANA" | "PERI" | "SUPER"

interface PricingParams {
  zone: Zone
  weightKg: number
  isExpress: boolean
}

/**
 * Nouvelle grille tarifaire 2025
 * 
 * STANDARD (J+1):
 * - TANA-VILLE:        ≤2kg: 3000 Ar | 2-5kg: 6000 Ar | Récup: gratuite
 * - PÉRIPHÉRIE:        ≤2kg: 3000 Ar | 2-5kg: 7000 Ar | Récup: gratuite (≥3 colis), sinon 2000 Ar
 * - SUPER-PÉRIPHÉRIE:  ≤2kg: 4000 Ar | 2-5kg: 8000 Ar | Récup: 5000 Ar
 * 
 * EXPRESS (même jour):
 * - TANA-VILLE:        ≤2kg: 5000 Ar | 2-5kg: 8000 Ar | Récup: gratuite
 * - PÉRIPHÉRIE:        ≤2kg: 7000 Ar | 2-5kg: 10000 Ar | Récup: gratuite (≥3 colis), sinon 2000 Ar
 * - SUPER-PÉRIPHÉRIE:  ≤2kg: 10000 Ar | 2-5kg: 13000 Ar | Récup: 5000 Ar
 */

// Tarifs STANDARD (J+1)
const STANDARD_PRICES: Record<Zone, { upTo2kg: number; from2to5kg: number }> = {
  TANA: { upTo2kg: 3000, from2to5kg: 6000 },
  PERI: { upTo2kg: 3000, from2to5kg: 7000 },
  SUPER: { upTo2kg: 4000, from2to5kg: 8000 },
}

// Tarifs EXPRESS (même jour)
const EXPRESS_PRICES: Record<Zone, { upTo2kg: number; from2to5kg: number }> = {
  TANA: { upTo2kg: 5000, from2to5kg: 8000 },
  PERI: { upTo2kg: 7000, from2to5kg: 10000 },
  SUPER: { upTo2kg: 10000, from2to5kg: 13000 },
}

// Frais de récupération (non utilisés dans computePrice, mais disponibles pour référence)
export const PICKUP_FEES: Record<Zone, { standard: number; minColisForFree?: number }> = {
  TANA: { standard: 0 }, // Toujours gratuit
  PERI: { standard: 2000, minColisForFree: 3 }, // Gratuit si ≥3 colis
  SUPER: { standard: 5000 }, // Toujours 5000 Ar
}

/**
 * Calcule le prix de livraison selon la nouvelle grille tarifaire
 * 
 * @param zone - Zone de livraison (TANA, PERI, SUPER)
 * @param weightKg - Poids du colis en kg
 * @param isExpress - Si true, utilise les tarifs Express (même jour)
 * @returns Prix de livraison en Ar
 */
export function computePrice({ zone, weightKg, isExpress }: PricingParams): number {
  // Validation: ensure zone is valid, default to TANA if not
  const validZone: Zone = zone && (zone === "TANA" || zone === "PERI" || zone === "SUPER") 
    ? zone 
    : "TANA"
  
  if (validZone !== zone) {
    console.warn(`⚠️ Zone invalide: "${zone}", utilisation de "TANA" par défaut`)
  }

  // Sélectionner la grille tarifaire (Standard ou Express)
  const priceGrid = isExpress ? EXPRESS_PRICES : STANDARD_PRICES

  let deliveryPrice = 0

  // Calcul selon le poids
  if (weightKg <= 2) {
    deliveryPrice = priceGrid[validZone].upTo2kg
  } else if (weightKg <= 5) {
    deliveryPrice = priceGrid[validZone].from2to5kg
  } else {
    // Pour les poids > 5kg, on applique un tarif progressif
    // Base: prix 2-5kg + 2000 Ar par kg supplémentaire
    const extraKg = Math.ceil(weightKg - 5)
    deliveryPrice = priceGrid[validZone].from2to5kg + (extraKg * 2000)
  }

  return deliveryPrice
}

/**
 * Calcule les frais de récupération selon le nombre de colis
 * 
 * @param zone - Zone de récupération
 * @param parcelCount - Nombre de colis à récupérer
 * @returns Frais de récupération en Ar
 */
export function computePickupFee(zone: Zone, parcelCount: number): number {
  const pickupInfo = PICKUP_FEES[zone]
  
  // Si zone a une condition pour gratuit (ex: PERI ≥3 colis)
  if (pickupInfo.minColisForFree && parcelCount >= pickupInfo.minColisForFree) {
    return 0
  }
  
  return pickupInfo.standard
}

/**
 * Obtient le résumé des tarifs pour une zone donnée
 */
export function getPricingSummary(zone: Zone): {
  standard: { upTo2kg: number; from2to5kg: number }
  express: { upTo2kg: number; from2to5kg: number }
  pickupFee: { standard: number; minColisForFree?: number }
} {
  return {
    standard: STANDARD_PRICES[zone],
    express: EXPRESS_PRICES[zone],
    pickupFee: PICKUP_FEES[zone],
  }
}
