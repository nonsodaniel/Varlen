/**
 * Format a numeric amount as a currency string.
 * Examples:
 *   fmt(1234.5)    → "1,234.50"
 *   fmt(1234.5, 0) → "1,235"
 *   fmt(0.99)      → "0.99"
 */
export function fmt(amount: number, decimals: 2 | 0 | 1 = 2): string {
  return amount.toLocaleString(undefined, {
    minimumFractionDigits: decimals,
    maximumFractionDigits: decimals,
  });
}
