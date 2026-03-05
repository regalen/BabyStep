export type UnitSystem = "metric" | "imperial";

// ─── Volume (feeding amounts) ─────────────────────────────────────────────────

const ML_PER_OZ = 29.5735;

export function formatVolume(ml: number | null | undefined, units: UnitSystem): string {
  if (ml == null) return "";
  if (units === "imperial") return `${(ml / ML_PER_OZ).toFixed(1)} oz`;
  return `${Math.round(ml)} ml`;
}

export function parseVolumeToMl(value: string, units: UnitSystem): number {
  const num = parseFloat(value);
  if (isNaN(num)) return 0;
  if (units === "imperial") return num * ML_PER_OZ;
  return num;
}

export function volumeLabel(units: UnitSystem): string {
  return units === "imperial" ? "oz" : "ml";
}

export function volumePlaceholder(units: UnitSystem): string {
  return units === "imperial" ? "e.g. 3.0" : "e.g. 90";
}

// ─── Weight (birth weight, growth) ───────────────────────────────────────────

const G_PER_LB = 453.592;
const G_PER_KG = 1000;

export function formatWeight(grams: number | null | undefined, units: UnitSystem): string {
  if (grams == null) return "";
  if (units === "imperial") {
    const lbs = grams / G_PER_LB;
    const wholeLbs = Math.floor(lbs);
    const oz = Math.round((lbs - wholeLbs) * 16);
    if (oz === 0) return `${wholeLbs} lbs`;
    return `${wholeLbs} lbs ${oz} oz`;
  }
  return `${(grams / G_PER_KG).toFixed(2)} kg`;
}

export function parseWeightToGrams(value: string, units: UnitSystem): number {
  const num = parseFloat(value);
  if (isNaN(num)) return 0;
  if (units === "imperial") return num * G_PER_LB;
  return num * G_PER_KG;
}

export function weightLabel(units: UnitSystem): string {
  return units === "imperial" ? "lbs" : "kg";
}

export function weightPlaceholder(units: UnitSystem): string {
  return units === "imperial" ? "e.g. 7.5" : "e.g. 3.4";
}

/** Convert stored grams to display value string (for input fields) */
export function gramsToDisplayValue(grams: number | null | undefined, units: UnitSystem): string {
  if (grams == null) return "";
  if (units === "imperial") return (grams / G_PER_LB).toFixed(2);
  return (grams / G_PER_KG).toFixed(3);
}
