/**
 * Parses a number typed into a text field. Accepts a comma as the decimal
 * separator; an empty field becomes NaN so Zod reports it as missing.
 */
export function parseDecimal(value: string): number {
  return value.trim() === "" ? Number.NaN : Number(value.replace(",", "."));
}
