/** Villes proposées pour les restaurateurs (Belgique). */
export const VILLES_LIST = [
  "Bruxelles",
  "Liège",
  "Louvain-la-Neuve",
  "Charleroi",
  "Namur",
] as const;

export const VILLE_AUTRE = "Autre" as const;

/** Toutes les options du select : 5 villes + "Autre". */
export const VILLES_OPTIONS = [...VILLES_LIST, VILLE_AUTRE] as const;

export type VilleOption = (typeof VILLES_OPTIONS)[number];

/** Retourne true si la valeur en base correspond à une des villes prédéfinies. */
export function isVillePredefinie(value: string | null | undefined): boolean {
  if (value == null || value === "") return false;
  return VILLES_LIST.includes(value as (typeof VILLES_LIST)[number]);
}
