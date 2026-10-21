import { router, useLocalSearchParams } from "expo-router";
import { ClipboardList, FileText } from "lucide-react-native";
import { AppBackButton } from "@/components/nav/AppBackButton";
import React, { useEffect, useMemo, useState } from "react";
import {
  ActivityIndicator,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from "react-native";
import {
  RecordsBottomChrome,
  recordsBottomChromeHeight,
} from "@/components/records/RecordsBottomChrome";
import {
  getCategoryMeta,
  getLocalizedCategoryLabel,
  getRecordSubtitle,
  getRecordTimestamp,
  groupRecordsByMonth,
  withoutIntakeRecords,
} from "@/components/records/medicalRecordCategories";
import { buildMedicalAddEntryHref } from "@/domains/medical/addHref";
import { fetchAllMedicalHistory } from "@/domains/medical/api";
import { parseBodyPart } from "@/domains/medical/bodyParts";
import { filterMedicalRecords } from "@/domains/medical/search";
import type { MedicalRecord } from "@/domains/medical/types";
import { useAuthStore } from "@/domains/auth/store";
import { useMedicalStore } from "@/domains/medical/store";
import { useColors } from "@/hooks/useColors";
import { MobileWebMenuHeader } from "@/components/web/MobileWebMenuHeader";
import { useI18n } from "@/hooks/useI18n";
import { resolveMedicalOwnerUserId } from "@/domains/medical/ownerUserId";
import { alignText, flexRow, localeTag } from "@/utils/rtl";
import { readRouteParam } from "@/utils/routeParams";
import { useSafeAreaInsets } from "react-native-safe-area-context";

type Props = {
  recordsOverride?: MedicalRecord[];
  canAdd?: boolean;
  doctorView?: boolean;
};

export function BodyPartRecordsView({
  recordsOverride,
  canAdd = true,
  doctorView = false,
}: Props) {
  const colors = useColors();
  const { t, isRTL } = useI18n();
  const insets = useSafeAreaInsets();
  const dir = flexRow(isRTL);
  const textAlign = alignText(isRTL);
  const dateLocale = localeTag(isRTL);
  const profile = useAuthStore((s) => s.profile);
  const accessToken = useAuthStore((s) => s.accessToken);
  const role = useAuthStore((s) => s.role);
  const storeRecords = useMedicalStore((s) => s.records);
  const params = useLocalSearchParams<{
    part?: string | string[];
    patientUserId?: string | string[];
  }>();
  const partParam = readRouteParam(params.part);
  const patientUserIdParam = readRouteParam(params.patientUserId);

  const bodyPart = parseBodyPart(partParam);
  const ownerUserId = resolveMedicalOwnerUserId(patientUserIdParam, profile?.id);
  const isDoctor = role?.toLowerCase() === "doctor";
  const viewingPatient =
    !!patientUserIdParam && patientUserIdParam !== profile?.id;
  const asDoctorView = doctorView || (isDoctor && viewingPatient);
  const showDiagnosis = asDoctorView;

  const [fetched, setFetched] = useState<MedicalRecord[] | null>(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (recordsOverride) return;
    if (!ownerUserId || !accessToken) return;
    let cancelled = false;
    setLoading(true);
    void fetchAllMedicalHistory(ownerUserId, accessToken, role ?? undefined)
      .then((rows) => {
        if (!cancelled) setFetched(withoutIntakeRecords(rows));
      })
      .catch(() => {
        if (!cancelled) setFetched([]);
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [ownerUserId, accessToken, role, recordsOverride]);

  const sourceRecords =
    recordsOverride ?? fetched ?? withoutIntakeRecords(storeRecords);

  const filtered = useMemo(() => {
    if (!bodyPart) return [];
    return filterMedicalRecords(sourceRecords, {
      text: "",
      doctorName: "",
      bodyPart,
      dateMode: "any",
      dateFrom: null,
      dateTo: null,
      singleDate: null,
    }).sort((a, b) => getRecordTimestamp(b) - getRecordTimestamp(a));
  }, [sourceRecords, bodyPart]);

  const grouped = useMemo(
    () => groupRecordsByMonth(filtered, dateLocale),
    [filtered, dateLocale],
  );

  const partLabel = bodyPart
    ? bodyPart === "general"
      ? t.records.bodyPartAll
      : t.records.bodyParts[bodyPart]
    : t.records.bodyPart;

  const openAdd = () => {
    router.push(
      buildMedicalAddEntryHref({
        patientUserId: viewingPatient ? ownerUserId : undefined,
        bodyPart: bodyPart ?? undefined,
        isPatient: role?.toLowerCase() === "patient",
      }) as never,
    );
  };

  if (!bodyPart) {
    return (
      <View style={[styles.root, { backgroundColor: colors.background }]}>
        <Text style={{ color: colors.mutedForeground, textAlign: "center", marginTop: 40 }}>
          {isRTL ? "جزء غير صالح" : "Invalid body part"}
        </Text>
      </View>
    );
  }

  return (
    <View style={[styles.root, { backgroundColor: colors.background }]}>
      <MobileWebMenuHeader />
      <View style={[styles.header, { flexDirection: dir, borderBottomColor: colors.border }]}>
        <AppBackButton
          color={colors.foreground}
          size={20}
          style={[styles.backBtn, { flexDirection: dir }]}
          hitSlop={8}
        />
        <View style={{ flex: 1, gap: 2 }}>
          <Text style={[styles.title, { color: colors.foreground, textAlign }]} numberOfLines={1}>
            {partLabel}
          </Text>
          <Text style={[styles.subtitle, { color: colors.mutedForeground, textAlign }]}>
            {filtered.length === 0
              ? isRTL
                ? "لا توجد سجلات"
                : "No records"
              : isRTL
                ? `${filtered.length} سجل`
                : `${filtered.length} record${filtered.length === 1 ? "" : "s"}`}
          </Text>
        </View>
      </View>

      <ScrollView
        style={styles.scroll}
        contentContainerStyle={[
          styles.scrollContent,
          {
            paddingBottom: recordsBottomChromeHeight({
              canAdd,
              extra: 24,
              safeAreaBottom: insets.bottom,
            }),
          },
        ]}
        keyboardShouldPersistTaps="handled"
      >
        {loading && !fetched ? (
          <ActivityIndicator color={colors.primary} style={{ marginTop: 40 }} />
        ) : filtered.length === 0 ? (
          <View style={[styles.empty, { borderColor: colors.border, backgroundColor: colors.card }]}>
            <Text style={{ color: colors.foreground, fontWeight: "700", textAlign: "center" }}>
              {isRTL ? "لا سجلات لهذا الجزء" : "No records for this part"}
            </Text>
            <Text
              style={{
                color: colors.mutedForeground,
                textAlign: "center",
                marginTop: 6,
                lineHeight: 20,
              }}
            >
              {isRTL
                ? "أضف سجلاً طبياً مرتبطاً بهذا الجزء."
                : "Add a medical record linked to this body part."}
            </Text>
          </View>
        ) : (
          grouped.map(({ key, label, items }) => (
            <View key={key} style={styles.monthBlock}>
              <Text style={[styles.monthLabel, { color: colors.mutedForeground, textAlign }]}>
                {label}
              </Text>
              {items.map((record, index) => {
                const meta = getCategoryMeta(record.category);
                const Icon = meta.Icon ?? FileText;
                const subtitle = getRecordSubtitle(record);
                return (
                  <Pressable
                    key={record.id}
                    onPress={() => {
                      if (asDoctorView && ownerUserId) {
                        router.push({
                          pathname: "/medical/[id]",
                          params: {
                            id: record.id,
                            doctorView: "1",
                            patientUserId: ownerUserId,
                          },
                        });
                        return;
                      }
                      router.push(`/medical/${record.id}` as never);
                    }}
                    style={[
                      styles.card,
                      {
                        borderColor: colors.border,
                        backgroundColor: colors.card,
                        marginBottom: index === items.length - 1 ? 0 : 8,
                      },
                    ]}
                  >
                    <View style={[styles.cardRow, { flexDirection: dir }]}>
                      <View
                        style={[styles.iconBubble, { backgroundColor: `${meta.color}18` }]}
                      >
                        <Icon size={18} color={meta.color} />
                      </View>
                      <View style={{ flex: 1, gap: 2, minWidth: 0 }}>
                        <Text
                          style={{ color: colors.foreground, fontWeight: "700", textAlign }}
                          numberOfLines={2}
                        >
                          {record.title || getLocalizedCategoryLabel(record.category, t)}
                        </Text>
                        {subtitle ? (
                          <Text
                            style={{ color: colors.mutedForeground, fontSize: 13, textAlign }}
                            numberOfLines={2}
                          >
                            {subtitle}
                          </Text>
                        ) : null}
                        <Text style={{ color: colors.mutedForeground, fontSize: 12, textAlign }}>
                          {new Date(record.date).toLocaleDateString(dateLocale, {
                            month: "short",
                            day: "numeric",
                            year: "numeric",
                          })}
                        </Text>
                      </View>
                      <ClipboardList size={16} color={colors.mutedForeground} />
                    </View>
                  </Pressable>
                );
              })}
            </View>
          ))
        )}
      </ScrollView>

      <RecordsBottomChrome
        canAdd={canAdd}
        onAdd={openAdd}
        showDiagnosis={showDiagnosis}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1 },
  header: {
    alignItems: "center",
    gap: 10,
    paddingHorizontal: 12,
    paddingVertical: 12,
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
  backBtn: { padding: 4 },
  title: { fontSize: 18, fontWeight: "800" },
  subtitle: { fontSize: 13, fontWeight: "600" },
  scroll: { flex: 1 },
  scrollContent: { padding: 16, gap: 16 },
  empty: {
    borderWidth: 1,
    borderRadius: 14,
    padding: 20,
  },
  monthBlock: { gap: 8 },
  monthLabel: { fontSize: 12, fontWeight: "800", letterSpacing: 0.4 },
  card: {
    borderWidth: 1,
    borderRadius: 14,
    padding: 12,
  },
  cardRow: { alignItems: "center", gap: 10 },
  iconBubble: {
    width: 36,
    height: 36,
    borderRadius: 12,
    alignItems: "center",
    justifyContent: "center",
  },
});
