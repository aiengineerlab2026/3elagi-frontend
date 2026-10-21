import { useEffect, useMemo, useState } from "react";
import { useAuthStore } from "@/domains/auth/store";
import {
  fetchPointPricing,
  type PointCurrency,
  type PointPricing,
} from "@/domains/points/api";
import { pricePerPoint } from "@/constants/patientCountries";
import { resolvePatientGeoCountry } from "@/domains/patient/geo";

/** Live credit price from patient profile residence, else IP. */
export function useIpPointPricing() {
  const role = useAuthStore((s) => s.role);
  const profileCountry = useAuthStore((s) => s.profile?.country);
  const [pricing, setPricing] = useState<PointPricing | null>(null);
  const [loading, setLoading] = useState(true);
  const [clientCountry, setClientCountry] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    void (async () => {
      setLoading(true);
      const geo = await resolvePatientGeoCountry();
      if (cancelled) return;
      setClientCountry(geo);
      const next = await fetchPointPricing(geo);
      if (!cancelled) {
        setPricing(next);
        setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [role, profileCountry]);

  const detectedCountry = pricing?.detectedCountry ?? clientCountry;

  const rate =
    pricing?.pricePerPoint ?? pricePerPoint(detectedCountry ?? "XX");
  const currency: PointCurrency = pricing?.currency ?? "USD";
  const market =
    pricing?.market ??
    (detectedCountry === "EG" ? "EG" : detectedCountry === "JO" ? "JO" : "INTL");

  const moneyForAmount = useMemo(
    () => (points: number) => Math.round(points) * rate,
    [rate],
  );

  return {
    pricing,
    loading,
    detectedCountry,
    market,
    rate,
    currency,
    moneyForAmount,
  };
}
