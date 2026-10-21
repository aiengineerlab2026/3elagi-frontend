import { useEffect, useState } from "react";
import { useAuthStore } from "@/domains/auth/store";
import { detectCountryFromIp } from "@/domains/points/detectCountry";

/**
 * ISO-2 country for patient-facing pricing. Signed-in patients use profile
 * residence; everyone else falls back to IP. `null` until IP answers when no
 * profile country — treated as abroad by the fee helpers.
 */
export function useViewerCountry(): string | null {
  const role = useAuthStore((s) => s.role);
  const profileCountry = useAuthStore((s) => s.profile?.country);
  const [ipCountry, setIpCountry] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    void detectCountryFromIp()
      .then((code) => {
        if (!cancelled) setIpCountry(code);
      })
      .catch(() => undefined);
    return () => {
      cancelled = true;
    };
  }, []);

  if (role?.toLowerCase() === "patient" && profileCountry?.trim()) {
    return profileCountry.trim().toUpperCase();
  }

  return ipCountry;
}
