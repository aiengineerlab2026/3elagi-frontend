import { useFocusEffect } from "@react-navigation/native";
import { router } from "expo-router";
import React, { useCallback, useEffect, useRef, useState } from "react";
import { promptAuthForConsultation } from "@/domains/auth/guestBrowse";
import {
  ActivityIndicator,
  Platform,
  Pressable,
  RefreshControl,
  ScrollView,
  StyleSheet,
  Text,
  View,
  type ScrollView as ScrollViewType,
} from "react-native";
import { useAiEnabled } from "@/domains/ai/aiPreference";
import { AppHeader } from "@/components/AppHeader";
import { CircledCountryFlag } from "@/components/country/CircledCountryFlag";
import { DoctorChatRoster } from "@/components/DoctorChatRoster";
import { HomeHeroWithTvVideo } from "@/components/home/HomeHeroWithTvVideo";
import { HomePatientHeader } from "@/components/home/HomePatientHeader";
import { HomeHealthSummary } from "@/components/home/HomeHealthSummary";
import { DoctorHomeBrowse } from "@/components/home/DoctorHomeBrowse";
import { PublicLandingSections } from "@/components/marketing/PublicLandingSections";
import { useHardwareBackHandler } from "@/hooks/useHardwareBackHandler";
import { useRecordAppVisit } from "@/hooks/useRecordAppVisit";
import { SpecialityGrid } from "@/components/SpecialityBrowse";
import { HOME_NAV_RESET_EVENT } from "@/constants/appNav";
import { patientCountryLabel } from "@/constants/patientCountries";
import { useAuthStore } from "@/domains/auth/store";
import { isSignedIn } from "@/domains/auth/session";
import {
  fetchDoctorsBySpeciality,
  fetchSpecialities,
  mergeDoctorIntoRoster,
  type Speciality,
  type SpecialityDoctor,
  type SpecialityDoctorRow,
} from "@/domains/home/api";
import { buildSpecialityDoctorsHref } from "@/domains/home/specialityRoutes";
import {
  getDomainMarketCountry,
} from "@/domains/market/resolveMarketCountry";
import { onDoctorRegistered } from "@/domains/presence/socket";
import { BRAND_SCROLL_NATIVE_ID } from "@/components/web/globalWebStyles";
import { surfaceCard, UI } from "@/constants/uiTokens";
import { useColors } from "@/hooks/useColors";
import { useI18n } from "@/hooks/useI18n";
import { on } from "@/utils/eventBus";
import { alignText } from "@/utils/rtl";

function ChatsHomeBrowse() {
  const colors = useColors();
  const { t, isRTL } = useI18n();
  const textAlign = alignText(isRTL);
  const profile = useAuthStore((s) => s.profile);
  const accessToken = useAuthStore((s) => s.accessToken);
  const role = useAuthStore((s) => s.role);
  const signedIn = isSignedIn(profile, accessToken);
  const isDoctor = role?.toLowerCase() === "doctor";
  const aiEnabled = useAiEnabled();
  const domainMarket = getDomainMarketCountry();
  const [specialities, setSpecialities] = useState<Speciality[]>([]);
  const [selectedSpeciality, setSelectedSpeciality] = useState<Speciality | null>(
    null,
  );
  const [doctors, setDoctors] = useState<SpecialityDoctor[]>([]);
  const [loadingHome, setLoadingHome] = useState(true);
  const [loadingDoctors, setLoadingDoctors] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const loadHome = useCallback(async () => {
    if (isDoctor && signedIn) return;
    setLoadingHome(true);
    setError(null);
    try {
      setSpecialities(await fetchSpecialities());
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to load home data");
    } finally {
      setLoadingHome(false);
    }
  }, [isDoctor, signedIn]);

  useEffect(() => {
    if (isDoctor && signedIn) return;
    void loadHome();
  }, [loadHome, isDoctor, signedIn]);

  useEffect(
    () =>
      on(HOME_NAV_RESET_EVENT, () => {
        setSelectedSpeciality(null);
        setDoctors([]);
        setError(null);
      }),
    [],
  );

  useFocusEffect(
    useCallback(() => {
      if (isDoctor && signedIn) return;
      // Only fetch when we have nothing yet — refetching on every tab focus
      // caused a network round-trip + re-render that made the home tab feel
      // like it hung when switching back to it.
      if (!selectedSpeciality && specialities.length === 0) void loadHome();
    }, [loadHome, selectedSpeciality, specialities.length, isDoctor, signedIn]),
  );

  useEffect(() => {
    if (!selectedSpeciality) return;
    let cancelled = false;
    (async () => {
      setLoadingDoctors(true);
      setDoctors([]);
      setError(null);
      try {
        const rows = await fetchDoctorsBySpeciality(selectedSpeciality.id);
        if (!cancelled) setDoctors(rows);
      } catch (e) {
        if (!cancelled) {
          setError(e instanceof Error ? e.message : "Failed to load doctors");
        }
      } finally {
        if (!cancelled) setLoadingDoctors(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [selectedSpeciality?.id]);

  useEffect(() => {
    if (!selectedSpeciality) return;

    onDoctorRegistered((payload: SpecialityDoctorRow) => {
      setDoctors((current) =>
        mergeDoctorIntoRoster(current, payload, selectedSpeciality.id),
      );
      setLoadingDoctors(false);
    });

    return () => onDoctorRegistered(null);
  }, [selectedSpeciality?.id]);

  // The doctor roster is in-page state, not a route, so hardware back has
  // nothing to pop — without this it fell through to the global handler and
  // closed the app instead of returning to the speciality list.
  const clearSpeciality = useCallback(() => {
    setSelectedSpeciality(null);
    setDoctors([]);
    setError(null);
  }, []);

  useHardwareBackHandler(() => {
    if (!selectedSpeciality) return false;
    clearSpeciality();
    return true;
  }, !!selectedSpeciality);

  const openDoctorProfile = useCallback(
    (doctorUserId: string, doctorEntityId?: string) => {
      if (!signedIn) {
        promptAuthForConsultation(`/chat/${doctorUserId}`);
        return;
      }
      if (!doctorEntityId) {
        router.push({
          pathname: "/chat/[id]",
          params: { id: doctorUserId, from: "doctors" },
        });
        return;
      }
      router.push({
        pathname: "/doctor/[doctorId]",
        params: { doctorId: doctorEntityId, userId: doctorUserId },
      });
    },
    [signedIn],
  );

  const startConsultationWithDoctor = useCallback(
    (doctorUserId: string) => {
      if (!signedIn) {
        promptAuthForConsultation(`/chat/${doctorUserId}`);
        return;
      }
      router.push({
        pathname: "/chat/[id]",
        params: { id: doctorUserId, from: "doctors" },
      });
    },
    [signedIn],
  );

  const scrollRef = useRef<ScrollViewType>(null);

  const openDoctorDirectory = useCallback(() => router.push("/doctors"), []);

  const selectSpeciality = useCallback((item: Speciality) => {
    if (Platform.OS === "web") {
      router.push(buildSpecialityDoctorsHref(item));
      return;
    }
    setSelectedSpeciality(item);
  }, []);

  if (isDoctor && signedIn) {
    return <DoctorHomeBrowse />;
  }

  if (loadingHome && specialities.length === 0) {
    return (
      <ActivityIndicator style={{ marginTop: 40 }} color={colors.primary} />
    );
  }

  if (error && specialities.length === 0 && !selectedSpeciality) {
    return (
      <View style={styles.empty}>
        <Text style={{ color: "#ef4444", textAlign: "center", paddingHorizontal: 24 }}>
          {error}
        </Text>
        <Pressable
          onPress={() => void loadHome()}
          style={({ pressed }) => [{ opacity: pressed ? 0.7 : 1, marginTop: 12 }]}
        >
          <Text style={{ color: colors.primary, fontWeight: "700" }}>
            {isRTL ? "إعادة المحاولة" : "Retry"}
          </Text>
        </Pressable>
      </View>
    );
  }

  if (selectedSpeciality) {
    return (
      <DoctorChatRoster
        speciality={selectedSpeciality}
        doctors={doctors}
        loading={loadingDoctors}
        isRTL={isRTL}
        onBack={clearSpeciality}
        onSelectDoctor={openDoctorProfile}
        onStartConsultation={startConsultationWithDoctor}
      />
    );
  }

  return (
    <ScrollView
      ref={scrollRef}
      nativeID={BRAND_SCROLL_NATIVE_ID}
      style={styles.scroll}
      contentContainerStyle={styles.scrollContent}
      showsVerticalScrollIndicator
      refreshControl={
        <RefreshControl refreshing={loadingHome} onRefresh={() => void loadHome()} />
      }
    >
      <View style={signedIn ? styles.pageContent : styles.guestContent}>
      {!signedIn ? (
        <PublicLandingSections />
      ) : (
        <>
          <HomeHeroWithTvVideo>
            <HomePatientHeader
              aiEnabled={aiEnabled}
              signedIn={signedIn}
              besideMedia
              onFindDoctor={openDoctorDirectory}
            />
          </HomeHeroWithTvVideo>
          <HomeHealthSummary signedIn={signedIn} />
        </>
      )}
      {domainMarket ? (
        <View
          style={[
            styles.marketBanner,
            {
              backgroundColor: colors.muted,
              borderColor: colors.border,
              flexDirection: isRTL ? "row-reverse" : "row",
            },
          ]}
        >
          <CircledCountryFlag country={domainMarket} size={28} />
          <Text style={[styles.marketBannerText, { color: colors.foreground }]}>
            {isRTL
              ? `أطباء ${patientCountryLabel(domainMarket, true)} فقط`
              : `Showing doctors from ${patientCountryLabel(domainMarket, false)} only`}
          </Text>
        </View>
      ) : null}
      {error ? (
        <View style={styles.empty}>
          <Text style={{ color: "#ef4444", textAlign: "center", paddingHorizontal: 24 }}>
            {error}
          </Text>
          <Pressable
            onPress={() => void loadHome()}
            style={({ pressed }) => [{ opacity: pressed ? 0.7 : 1, marginTop: 12 }]}
          >
            <Text style={{ color: colors.primary, fontWeight: "700" }}>
              {isRTL ? "إعادة المحاولة" : "Retry"}
            </Text>
          </Pressable>
        </View>
      ) : null}
      {specialities.length === 0 && !loadingHome && !error ? (
        <View style={[styles.empty, surfaceCard(colors.card, colors.border), styles.emptyCard]}>
          <Text style={{ color: colors.mutedForeground, textAlign: "center", fontSize: 14, lineHeight: 20 }}>
            {isRTL ? "لا توجد تخصصات متاحة حاليًا" : "No specialities available right now. Check back soon."}
          </Text>
        </View>
      ) : (
        <>
          <View style={styles.specialitiesHeading}>
            <Text style={[styles.specialitiesTitle, { color: colors.foreground, textAlign }]}>
              {t.landing.specialtiesTitle}
            </Text>
            <Text
              style={[styles.specialitiesSubtitle, { color: colors.mutedForeground, textAlign }]}
            >
              {t.landing.specialtiesSubtitle}
            </Text>
          </View>
          <SpecialityGrid
            specialities={specialities}
            isRTL={isRTL}
            onSelect={selectSpeciality}
          />
        </>
      )}
      </View>
    </ScrollView>
  );
}

export default function ChatsTab() {
  const colors = useColors();
  useRecordAppVisit();

  return (
    <View style={[styles.root, { backgroundColor: colors.background }]}>
      <AppHeader />
      <ChatsHomeBrowse />
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1 },
  scroll: { flex: 1 },
  scrollContent: { flexGrow: 1, gap: 8, paddingBottom: 24 },
  pageContent: { flexGrow: 1, gap: 8 },
  guestContent: { flexGrow: 1, width: "95%", alignSelf: "center", gap: 8 },
  specialitiesHeading: { marginHorizontal: 16, marginTop: 8, marginBottom: 4 },
  specialitiesTitle: { ...UI.type.section, fontSize: 20 },
  specialitiesSubtitle: { fontSize: 14, lineHeight: 20, marginTop: 4 },
  empty: { alignItems: "center", paddingVertical: 48, paddingHorizontal: 24 },
  emptyCard: { marginHorizontal: 16, marginTop: 8 },
  marketBanner: {
    marginHorizontal: 16,
    marginTop: 4,
    marginBottom: 8,
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderRadius: 16,
    borderWidth: StyleSheet.hairlineWidth,
    alignItems: "center",
    gap: 10,
  },
  marketBannerText: { fontSize: 14, fontWeight: "600", flex: 1, lineHeight: 20 },
});
