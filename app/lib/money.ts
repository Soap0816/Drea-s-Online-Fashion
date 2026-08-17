/**
 * All money is stored as integer cents to avoid floating point drift.
 * Display always uses the TT$ symbol per the business's settings.
 */
export function formatMoney(cents: number, symbol = "TT$"): string {
  const dollars = cents / 100;
  return `${symbol}${dollars.toLocaleString("en-TT", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  })}`;
}

export function dollarsToCents(dollars: number): number {
  return Math.round(dollars * 100);
}
