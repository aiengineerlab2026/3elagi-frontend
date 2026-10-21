import { API_BASE } from "@/constants/api";
import { resolvePatientGeoCountry } from "@/domains/patient/geo";

const CLIENT_GEO_HEADER = "X-Client-Geo-Country";

async function pricingRequestInit(clientGeo?: string | null): Promise<RequestInit> {
  const geo = clientGeo ?? (await resolvePatientGeoCountry());
  return geo ? { headers: { [CLIENT_GEO_HEADER]: geo } } : {};
}

/** Matches API signup default (`DEFAULT_MESSAGE_POINTS`). */
export const DEFAULT_AVAILABLE_POINTS = 10;

export interface PointsSummary {
  message_points: number;
  points_reserved?: number;
  points_spent_total: number;
  points_purchased_total: number;
  points_reimbursed_total?: number;
}

export async function fetchPointsBalance(token: string): Promise<PointsSummary> {
  const res = await fetch(`${API_BASE}/points`, {
    headers: { Authorization: `Bearer ${token}` },
  });
  const data = (await res.json().catch(() => ({}))) as PointsSummary & { message?: string };
  if (!res.ok) {
    throw new Error(data.message ?? `Failed to load points (${res.status})`);
  }
  return data;
}

export async function reimbursePoints(token: string): Promise<PointsSummary> {
  const res = await fetch(`${API_BASE}/points/reimburse`, {
    method: "POST",
    headers: { Authorization: `Bearer ${token}` },
  });
  const data = (await res.json().catch(() => ({}))) as PointsSummary & { message?: string };
  if (!res.ok) {
    throw new Error(data.message ?? `Failed to reimburse (${res.status})`);
  }
  return data;
}

export async function createVisaCheckout(
  token: string,
  amount: number,
): Promise<{ checkout_url: string }> {
  const geo = await resolvePatientGeoCountry();
  const headers: Record<string, string> = {
    Authorization: `Bearer ${token}`,
    "Content-Type": "application/json",
  };
  if (geo) headers["X-Client-Geo-Country"] = geo;

  const res = await fetch(`${API_BASE}/payments/credits/checkout/visa`, {
    method: "POST",
    headers,
    body: JSON.stringify({ amount }),
  });
  const data = (await res.json().catch(() => ({}))) as {
    checkout_url?: string;
    message?: string;
  };
  if (!res.ok || !data.checkout_url) {
    throw new Error(data.message ?? `Failed to start card payment (${res.status})`);
  }
  return { checkout_url: data.checkout_url };
}

export async function addMessagePoints(
  token: string,
  amount: number,
): Promise<PointsSummary> {
  const res = await fetch(`${API_BASE}/points/add`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${token}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ amount }),
  });
  const data = (await res.json().catch(() => ({}))) as PointsSummary & { message?: string };
  if (!res.ok) {
    throw new Error(data.message ?? `Failed to add points (${res.status})`);
  }
  return data;
}

export type PointMarket = "EG" | "JO" | "INTL";
export type PointCurrency = "EGP" | "JOD" | "USD";

export interface MarketPrice {
  market: PointMarket;
  currency: PointCurrency;
  pricePerPoint: number;
}

export interface PointPricing extends MarketPrice {
  /** Country the server read from the caller's IP, null when undetectable. */
  detectedCountry: string | null;
  /** Every market, for the public pricing table. */
  markets: MarketPrice[];
}

/** Live per-point price for wherever the caller is (public — no token). */
export async function fetchPointPricing(
  clientGeo?: string | null,
): Promise<PointPricing | null> {
  try {
    const init = await pricingRequestInit(clientGeo);
    const res = await fetch(`${API_BASE}/points/pricing`, init);
    if (!res.ok) return null;
    type Row = {
      market?: PointMarket;
      currency?: PointCurrency;
      price_per_point?: number;
    };
    const data = (await res.json()) as Row & {
      detected_country?: string | null;
      markets?: Row[];
    };
    if (!data?.currency || typeof data.price_per_point !== "number") return null;
    const markets = (data.markets ?? [])
      .filter(
        (row): row is Required<Row> =>
          !!row?.market && !!row.currency && typeof row.price_per_point === "number",
      )
      .map((row) => ({
        market: row.market,
        currency: row.currency,
        pricePerPoint: row.price_per_point,
      }));
    return {
      market: data.market ?? "EG",
      currency: data.currency,
      pricePerPoint: data.price_per_point,
      detectedCountry: data.detected_country ?? null,
      markets,
    };
  } catch {
    // Fall back to the profile-country price the screen already computes.
    return null;
  }
}
