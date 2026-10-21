import { router, useLocalSearchParams } from "expo-router";
import React, { useCallback, useEffect, useState } from "react";
import { ActivityIndicator, StyleSheet, Text, View } from "react-native";
import { AppHeader } from "@/components/AppHeader";
import { DoctorChatRoster } from "@/components/DoctorChatRoster";
import { AppSidebarDrawer } from "@/components/nav/AppSidebarDrawer";
import { AppSidebarProvider } from "@/contexts/AppSidebarContext";
import {
  fetchDoctorsBySpeciality,
  fetchSpecialities,
  mergeDoctorIntoRoster,
  type Speciality,
  type SpecialityDoctor,
  type SpecialityDoctorRow,
} from "@/domains/home/api";
import { findSpecialityBySlug } from "@/domains/home/specialityRoutes";
import { onDoctorRegistered } from "@/domains/presence/socket";
import { useColors } from "@/hooks/useColors";
import { useI18n } from "@/hooks/useI18n";
import { useOpenDoctor } from "@/hooks/useOpenDoctor";

/**
 * /speciality/cardiology — the doctors of one speciality, addressable by name
 * so a link can drop straight onto the roster instead of the browse grid.
 * The name may be English or Arabic; both slug to the same key.
 */
export default function SpecialityDoctorsScreen() {
  const colors = useColors();
  const { isRTL } = useI18n();
  const { name } = useLocalSearchParams<{ name: string }>();
  const { openDoctorProfile, startConsultationWithDoctor } = useOpenDoctor();

  const [speciality, setSpeciality] = useState<Speciality | null>(null);
  const [doctors, setDoctors] = useState<SpecialityDoctor[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const all = await fetchSpecialities();
      const slug = Array.isArray(name) ? name[0] : name;
      const found = findSpecialityBySlug(all, slug);
      if (!found) {
        setSpeciality(null);
        setDoctors([]);
        setError(isRTL ? "التخصص غير موجود" : "Speciality not found");
        return;
      }
      setSpeciality(found);
      setDoctors(await fetchDoctorsBySpeciality(found.id));
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to load doctors");
    } finally {
      setLoading(false);
    }
  }, [name, isRTL]);

  useEffect(() => {
    void load();
  }, [load]);

  // Doctors approved while the page is open join the roster live.
  useEffect(() => {
    if (!speciality) return;
    onDoctorRegistered((payload: SpecialityDoctorRow) => {
      setDoctors((current) => mergeDoctorIntoRoster(current, payload, speciality.id));
    });
    return () => onDoctorRegistered(null);
  }, [speciality?.id]);

  return (
    <AppSidebarProvider>
      <View style={[styles.root, { backgroundColor: colors.background }]}>
        <AppHeader />
        {error ? (
          <Text style={[styles.message, { color: colors.mutedForeground }]}>{error}</Text>
        ) : loading && !speciality ? (
          <ActivityIndicator style={styles.loader} color={colors.primary} />
        ) : speciality ? (
          <DoctorChatRoster
            speciality={speciality}
            doctors={doctors}
            loading={loading}
            isRTL={isRTL}
            onBack={() => router.back()}
            onSelectDoctor={openDoctorProfile}
            onStartConsultation={startConsultationWithDoctor}
          />
        ) : null}
        <AppSidebarDrawer />
      </View>
    </AppSidebarProvider>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1 },
  loader: { marginTop: 40 },
  message: { marginTop: 40, textAlign: "center", fontSize: 14 },
});
