/** Display formatting. Inputs are integer pence or 0–1 rates; conversion happens only here. */

const gbp = new Intl.NumberFormat("en-GB", { style: "currency", currency: "GBP", minimumFractionDigits: 2, maximumFractionDigits: 2 });
const gbp0 = new Intl.NumberFormat("en-GB", { style: "currency", currency: "GBP", minimumFractionDigits: 0, maximumFractionDigits: 0 });
const int = new Intl.NumberFormat("en-GB", { maximumFractionDigits: 0 });

export const NA = "n/a";

export function penceToPounds(p: number): number {
  return p / 100;
}

/** £1,234.56 — the minus sign is placed before the £. */
export function money(pence: number | null | undefined): string {
  if (pence === null || pence === undefined || !Number.isFinite(pence)) return NA;
  return gbp.format(pence / 100);
}

/** £1,235 — for axes and compact labels. */
export function moneyShort(pence: number | null | undefined): string {
  if (pence === null || pence === undefined || !Number.isFinite(pence)) return NA;
  const pounds = pence / 100;
  if (Math.abs(pounds) >= 10_000) return `${pounds < 0 ? "−" : ""}£${(Math.abs(pounds) / 1000).toFixed(1)}k`;
  return gbp0.format(pounds);
}

export function signedMoney(pence: number | null | undefined): string {
  if (pence === null || pence === undefined || !Number.isFinite(pence)) return NA;
  return `${pence > 0 ? "+" : pence < 0 ? "−" : "±"}${gbp.format(Math.abs(pence) / 100)}`;
}

export function count(n: number | null | undefined): string {
  if (n === null || n === undefined || !Number.isFinite(n)) return NA;
  return int.format(n);
}

export function signedCount(n: number | null | undefined): string {
  if (n === null || n === undefined || !Number.isFinite(n)) return NA;
  return `${n > 0 ? "+" : n < 0 ? "−" : "±"}${int.format(Math.abs(n))}`;
}

/** 0.1234 → "12.3%" */
export function pct(rate: number | null | undefined, digits = 1): string {
  if (rate === null || rate === undefined || !Number.isFinite(rate)) return NA;
  return `${(rate * 100).toFixed(digits)}%`;
}

export function signedPct(rate: number | null | undefined, digits = 1): string {
  if (rate === null || rate === undefined || !Number.isFinite(rate)) return NA;
  const v = rate * 100;
  return `${v > 0 ? "+" : v < 0 ? "−" : "±"}${Math.abs(v).toFixed(digits)}%`;
}

/** Percentage points, already on a 0–100 scale: 1.234 → "+1.2 pp" */
export function pp(points: number | null | undefined, digits = 1): string {
  if (points === null || points === undefined || !Number.isFinite(points)) return NA;
  return `${points > 0 ? "+" : points < 0 ? "−" : "±"}${Math.abs(points).toFixed(digits)} pp`;
}

export function ratio(x: number | null | undefined, digits = 2): string {
  if (x === null || x === undefined || !Number.isFinite(x)) return NA;
  return `${x.toFixed(digits)}×`;
}
