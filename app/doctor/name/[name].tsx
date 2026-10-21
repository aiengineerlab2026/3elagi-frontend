import { router, useLocalSearchParams } from "expo-router";
import React, { useEffect, useState } from "react";
import { ActivityIndicator, StyleSheet, Text, View } from "react-native";
import { fetchPublicDoctors } from "@/domains/doctor/api";
import { useColors } from "@/hooks/useColors";
import { useI18n } from "@/hooks/useI18n";
import { matchesSlug } from "@/utils/slug";

/**
 * /doctor/name/dr-sarah-hany — resolves the name to a doctor and hands over to
 * the real profile screen, so there is only ever one profile implementation.
 */
export default function DoctorByNameScreen() {
  const colors = useColors();
  const { isRTL } = useI18n();
  const { name } = useLocalSearchParams<{ name: string }>();
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    void (async () => {
      try {
        const doctors = await fetchPublicDoctors();
        const found = doctors.find((d) => matchesSlug(name, d.name));
        if (cancelled) return;
        if (!found) {
          setError(isRTL ? "الطبيب غير موجود" : "Doctor not found");
          return;
        }
        // replace: Back should leave the link, not bounce through the lookup.
        router.replace({
          pathname: "/doctor/[doctorId]",
          params: { doctorId: found.id, userId: found.userId },
        });
      } catch (e) {
        if (!cancelled) setError((e as Error).message);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [name, isRTL]);

  return (
    <View style={[styles.center, { backgroundColor: colors.background }]}>
      {error ? (
        <Text style={{ color: colors.mutedForeground }}>{error}</Text>
      ) : (
        <ActivityIndicator color={colors.primary} />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  center: { flex: 1, alignItems: "center", justifyContent: "center" },
});
