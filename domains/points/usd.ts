/**
 * USD value of one consultation credit by patient market (matches top-up pricing):
 * Egypt 2 USD, Jordan 15 USD, anywhere else 50 USD.
 *
 * These are only the fallback — the live rates live in the API's admin-editable
 * `point_pricing` table, and consultations carry the rate they were priced at
 * (`point_price_usd`). Pass it in whenever the API gave you one.
 */
const USD_PER_POINT: Record<"EG" | "JO" | "INTL", number> = {
  EG: 2,
  JO: 15,
  INTL: 50,
};

function marketOf(country?: string | null): "EG" | "JO" | "INTL" {
  const code = country?.trim().toUpperCase();
  if (code === "EG" || code === "JO") return code;
  return "INTL";
}

export function usdPerPoint(
  country?: string | null,
  /** Rate the API priced this row at; wins over the built-in table. */
  rate?: number | null,
): number {
  if (typeof rate === "number" && Number.isFinite(rate) && rate > 0) return rate;
  return USD_PER_POINT[marketOf(country)];
}

export function pointsToUsd(
  points: number,
  country?: string | null,
  rate?: number | null,
): number {
  const safe = Number.isFinite(points) ? points : 0;
  return safe * usdPerPoint(country, rate);
}

export function formatUsd(amount: number): string {
  return `${amount.toLocaleString("en-US", {
    minimumFractionDigits: amount % 1 === 0 ? 0 : 2,
    maximumFractionDigits: 2,
  })} USD`;
}
