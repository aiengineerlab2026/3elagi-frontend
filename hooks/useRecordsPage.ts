import { useFocusEffect } from "@react-navigation/native";
import { useCallback } from "react";
import { useAuthStore } from "@/domains/auth/store";
import { fetchAllMedicalHistory } from "@/domains/medical/api";
import { useMedicalStore } from "@/domains/medical/store";

export function useRecordsPage() {
  const profile = useAuthStore((s) => s.profile);
  const accessToken = useAuthStore((s) => s.accessToken);
  const role = useAuthStore((s) => s.role);
  const records = useMedicalStore((s) => s.records);
  const setRecordsFromApi = useMedicalStore((s) => s.setRecordsFromApi);

  const reloadRecords = useCallback(async () => {
    if (!profile || !accessToken) return;
    try {
      const apiRecords = await fetchAllMedicalHistory(
        profile.id,
        accessToken,
        role ?? undefined,
      );
      setRecordsFromApi(apiRecords, profile.id);
    } catch {
      setRecordsFromApi([], profile.id);
    }
  }, [profile, accessToken, role, setRecordsFromApi]);

  useFocusEffect(
    useCallback(() => {
      void reloadRecords();
    }, [reloadRecords]),
  );

  return {
    profile,
    accessToken,
    records,
    reloadRecords,
  };
}
