import { AppBackButton } from "@/components/nav/AppBackButton";
import { useFocusEffect } from "@react-navigation/native";
import { useLocalSearchParams, useRouter } from "expo-router";
import React, { useCallback, useEffect, useState } from "react";
import {
  ActivityIndicator,
  RefreshControl,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { DoctorPatientAccessDenied } from "@/components/DoctorPatientAccessDenied";
import { MedicalHistoryList } from "@/components/MedicalHistoryList";
import {
  DoctorPatientRecordsHeader,
} from "@/components/records/DoctorPatientRecordsHeader";
import type { ClinicalActionKey } from "@/components/records/DoctorClinicalActionBar";
import type { RecordsViewMode } from "@/components/records/RecordsViewModeToggle";
import { EHR } from "@/constants/ehrDesign";
import { useAuthStore } from "@/domains/auth/store";
import {
  canDoctorViewPatientRecords,
  fetchDoctorPatientAccess,
  type DoctorPatientAccessStatus,
} from "@/domains/chat/access";
import { fetchPatientMedicalHistoryAsDoctor } from "@/domains/medical/api";
import type { MedicalRecord } from "@/domains/medical/types";
import { useMedicalStore } from "@/domains/medical/store";
import {
  currentTourStep,
  useProductTourStore,
} from "@/domains/onboarding/productTourStore";
import { useColors } from "@/hooks/useColors";
import { useI18n } from "@/hooks/useI18n";
import { useWebLayout } from "@/hooks/useWebLayout";
import { navigateBack } from "@/utils/appNavigation";
import { readRouteParam } from "@/utils/routeParams";

export default function PatientRecordScreen() {
  const router = useRouter();
  const colors = useColors();
  const { isRTL } = useI18n();
  const { isDesktop } = useWebLayout();
  const insets = useSafeAreaInsets();
  const accessToken = useAuthStore((s) => s.accessToken);
  const role = useAuthStore((s) => s.role);
  const consumePendingRefresh = useMedicalStore((s) => s.consumePendingRefresh);
  const advanceOnAnchorTap = useProductTourStore((s) => s.advanceOnAnchorTap);
  const tourActive = useProductTourStore((s) => s.active);
  const tourPhase = useProductTourStore((s) => s.phase);
  const tourStepIndex = useProductTourStore((s) => s.stepIndex);
  const params = useLocalSearchParams<{ userId?: string | string[]; name?: string | string[] }>();
  const userId = readRouteParam(params.userId);
  const name = readRouteParam(params.name);

  const [records, setRecords] = useState<MedicalRecord[]>([]);
  const [accessStatus, setAccessStatus] = useState<DoctorPatientAccessStatus | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [recordsViewMode, setRecordsViewMode] = useState<RecordsViewMode>("table");
  const [clinicalBar, setClinicalBar] = useState<{
    consultationOpen: boolean;
    onAction: (key: ClinicalActionKey) => void;
  } | null>(null);

  const fixedBodyHost =
    recordsViewMode === "skeleton" || (isDesktop && recordsViewMode === "table");

  const isDoctor = role?.toLowerCase() === "doctor";
  const patientName = name || (isRTL ? "المريض" : "Patient");
  const hasAccess = canDoctorViewPatientRecords(accessStatus);

  const loadScreen = useCallback(async () => {
    if (!accessToken || !userId || !isDoctor) return;

    setLoadError(null);
    const status = await fetchDoctorPatientAccess(accessToken, userId);
    setAccessStatus(status);

    if (!canDoctorViewPatientRecords(status)) {
      setRecords([]);
      return;
    }

    const data = await fetchPatientMedicalHistoryAsDoctor(userId, accessToken);
    setRecords(data);
  }, [accessToken, userId, isDoctor]);

  useEffect(() => {
    if (!tourActive) return;
    const step = currentTourStep(tourPhase, tourStepIndex);
    if (step?.anchor === "records-skeleton-body") {
      setRecordsViewMode("skeleton");
    }
  }, [tourActive, tourPhase, tourStepIndex]);

  useEffect(() => {
    if (!isDoctor || !userId) {
      setLoading(false);
      return;
    }
    setLoading(true);
    loadScreen()
      .catch((e) => {
        setAccessStatus(null);
        setRecords([]);
        setLoadError(e instanceof Error ? e.message : "Failed to load patient");
      })
      .finally(() => setLoading(false));
  }, [isDoctor, userId, loadScreen]);

  useFocusEffect(
    useCallback(() => {
      if (!isDoctor || !userId) return;
      consumePendingRefresh();
      void loadScreen().catch((e) => {
        setRecords([]);
        setLoadError(e instanceof Error ? e.message : "Failed to load patient");
      });
    }, [isDoctor, userId, consumePendingRefresh, loadScreen]),
  );

  const onRefresh = async () => {
    setRefreshing(true);
    try {
      await loadScreen();
    } catch {
      setRecords([]);
    } finally {
      setRefreshing(false);
    }
  };

  const handleBack = () => {
    advanceOnAnchorTap("records-back");
    navigateBack(router, "/(tabs)/history");
  };

  if (!isDoctor) {
    return (
      <View style={[styles.center, { backgroundColor: EHR.bg.app }]}>
        <Text style={{ color: colors.mutedForeground }}>
          {isRTL ? "للأطباء فقط" : "For doctors only"}
        </Text>
      </View>
    );
  }

  const historyList = (
    <MedicalHistoryList
      records={records}
      patientUserId={userId!}
      patientLabel={patientName}
      canAdd={false}
      doctorView
      showIntake
      viewMode={recordsViewMode}
      onViewModeChange={setRecordsViewMode}
      hideTopChrome={isDesktop}
      onClinicalBarState={setClinicalBar}
      onRecordsChanged={() => {
        void loadScreen().catch(() => setRecords([]));
      }}
    />
  );

  return (
    <View style={[styles.root, { backgroundColor: EHR.bg.app }]}>
      {isDesktop ? (
        <DoctorPatientRecordsHeader
          patientName={patientName}
          viewMode={recordsViewMode}
          onViewModeChange={setRecordsViewMode}
          consultationOpen={clinicalBar?.consultationOpen ?? false}
          onClinicalAction={(key) => clinicalBar?.onAction(key)}
          onBack={handleBack}
          paddingTop={insets.top + EHR.headerPadding.vertical}
        />
      ) : (
        <View
          style={[
            styles.mobileHeader,
            {
              paddingTop: insets.top + 8,
              borderBottomColor: EHR.border,
              flexDirection: isRTL ? "row-reverse" : "row",
            },
          ]}
        >
          <AppBackButton
            testID="records-back"
            color={EHR.text.primary}
            hitSlop={12}
            fallback="/(tabs)/history"
            accessibilityLabel={isRTL ? "رجوع" : "Back"}
            onPress={handleBack}
          />
          <Text style={[styles.mobileTitle, { color: EHR.text.primary }]} numberOfLines={1}>
            {isRTL ? `سجل ${patientName}` : `${patientName}'s record`}
          </Text>
        </View>
      )}

      {loading ? (
        <ActivityIndicator style={{ marginTop: 40 }} color={EHR.brand} />
      ) : loadError ? (
        <View style={styles.center}>
          <Text style={{ color: "#ef4444", textAlign: "center", paddingHorizontal: 24 }}>
            {loadError}
          </Text>
        </View>
      ) : !hasAccess ? (
        <DoctorPatientAccessDenied isRTL={isRTL} />
      ) : fixedBodyHost ? (
        <View style={styles.workspace}>{historyList}</View>
      ) : (
        <ScrollView
          style={styles.body}
          contentContainerStyle={styles.bodyContent}
          nestedScrollEnabled
          showsVerticalScrollIndicator
          keyboardShouldPersistTaps="handled"
          refreshControl={
            <RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={EHR.brand} />
          }
        >
          {historyList}
          <View style={styles.bottomSpacer} />
        </ScrollView>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, minHeight: 0 },
  body: { flex: 1, minHeight: 0 },
  workspace: {
    flex: 1,
    minHeight: 0,
    paddingHorizontal: EHR.headerPadding.horizontal,
    paddingTop: 0,
    paddingBottom: EHR.workspaceGap,
  },
  bodyContent: { paddingBottom: 96 },
  bottomSpacer: { height: 48, width: "100%" },
  center: { flex: 1, alignItems: "center", justifyContent: "center", padding: 24 },
  mobileHeader: {
    alignItems: "center",
    gap: 8,
    paddingHorizontal: 12,
    paddingBottom: 12,
    borderBottomWidth: 1,
    backgroundColor: EHR.bg.card,
  },
  mobileTitle: { fontSize: 18, fontWeight: "800", flex: 1 },
});
