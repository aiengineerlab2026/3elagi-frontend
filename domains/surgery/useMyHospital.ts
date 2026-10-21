import { useCallback, useEffect, useState } from "react";
import { useAuthStore } from "@/domains/auth/store";
import { fetchMyHospital, type MyHospital } from "@/domains/surgery/api";
import { showErrorToast } from "@/utils/toast";

/** The signed-in hospital's record (links, slots, exceptions) with a reload. */
export function useMyHospital() {
  const token = useAuthStore((s) => s.accessToken);
  const [hospital, setHospital] = useState<MyHospital | null>(null);

  const reload = useCallback(async () => {
    if (!token) return;
    try {
      setHospital(await fetchMyHospital(token));
    } catch (e) {
      showErrorToast("Could not load hospital", (e as Error).message);
    }
  }, [token]);

  useEffect(() => {
    void reload();
  }, [reload]);

  return { token: token ?? "", hospital, setHospital, reload };
}
