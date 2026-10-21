import { router, useLocalSearchParams } from "expo-router";
import {
  Beaker,
  Calendar,
  FileDown,
  ScanLine,
  Upload,
  User,
  XCircle,
} from "lucide-react-native";
import React, { useCallback, useEffect, useState } from "react";
import {
  ActivityIndicator,
  Pressable,
  StyleSheet,
  Text,
  View,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { KeyboardSafeScrollView } from "@/components/KeyboardSafeScrollView";
import { AppBackButton } from "@/components/nav/AppBackButton";
import { navigateBack } from "@/utils/appNavigation";
import { useAuthStore } from "@/domains/auth/store";
import {
  cancelMedicalDocumentRequest,
  fetchMedicalDocumentRequestById,
  fetchMedicalDocumentRequestPdf,
  type MedicalDocumentRequest,
} from "@/domains/medical/api";
import { buildMedicalAddEntryHref } from "@/domains/medical/addHref";
import { MEDICAL_EVENTS, type MedicalDocumentRequestFulfilledPayload } from "@/domains/medical/events";
import { useApiLang } from "@/hooks/useApiLang";
import { useColors } from "@/hooks/useColors";
import { useI18n } from "@/hooks/useI18n";
import { showAppAlert } from "@/utils/appAlert";
import { emit, on } from "@/utils/eventBus";
import { openBlankPdfTab, openPdfInNewTab } from "@/utils/openPdfInNewTab";
import { alignText, flexRow, localeTag } from "@/utils/rtl";

function statusLabel(
  status: MedicalDocumentRequest["status"],
  isRTL: boolean,
): string {
  if (status === "fulfilled") return isRTL ? "مكتمل" : "Fulfilled";
  if (status === "cancelled") return isRTL ? "ملغى" : "Cancelled";
  return isRTL ? "معلّق" : "Pending";
}

export function MedicalDocumentRequestDetailScreen() {
  const colors = useColors();
  const { isRTL, t } = useI18n();
  const apiLang = useApiLang();
  const insets = useSafeAreaInsets();
  const { id, patientUserId } = useLocalSearchParams<{
    id: string;
    patientUserId?: string;
  }>();

  const accessToken = useAuthStore((s) => s.accessToken);
  const role = useAuthStore((s) => s.role);
  const isDoctor = role?.toLowerCase() === "doctor";
  const isPatient = role?.toLowerCase() === "patient";
  const dir = flexRow(isRTL);
  const textAlign = alignText(isRTL);

  const [request, setRequest] = useState<MedicalDocumentRequest | null>(null);
  const [loading, setLoading] = useState(true);
  const [printing, setPrinting] = useState(false);
  const [cancelling, setCancelling] = useState(false);

  const load = useCallback(async () => {
    if (!id || !accessToken) {
      setRequest(null);
      setLoading(false);
      return;
    }
    setLoading(true);
    try {
      const row = await fetchMedicalDocumentRequestById(id, accessToken, isDoctor);
      setRequest(row);
    } catch (err) {
      setRequest(null);
      showAppAlert(
        isRTL ? "تعذر التحميل" : "Could not load",
        err instanceof Error ? err.message : undefined,
      );
    } finally {
      setLoading(false);
    }
  }, [id, accessToken, isDoctor, isRTL]);

  useEffect(() => {
    void load();
  }, [load]);

  useEffect(() => {
    return on<MedicalDocumentRequestFulfilledPayload>(
      MEDICAL_EVENTS.DOCUMENT_REQUEST_FULFILLED,
      (payload) => {
        if (payload?.requestId && id && payload.requestId !== id) return;
        navigateBack(router, "/(tabs)/records");
      },
    );
  }, [id]);

  const printPdf = async () => {
    if (!accessToken || !request) return;
    setPrinting(true);
    const blankTab = openBlankPdfTab();
    try {
      const { pdf_url } = await fetchMedicalDocumentRequestPdf(
        request.id,
        accessToken,
        apiLang,
        true,
        isDoctor,
      );
      if (!pdf_url) throw new Error("PDF unavailable");
      await openPdfInNewTab(pdf_url, blankTab);
    } catch (err) {
      try {
        blankTab?.close?.();
      } catch {
        // ignore
      }
      showAppAlert(isRTL ? "فشل الطباعة" : "Print failed", (err as Error).message);
    } finally {
      setPrinting(false);
    }
  };

  const fulfill = () => {
    if (!request) return;
    router.push(
      buildMedicalAddEntryHref({
        category: request.type,
        requestId: request.id,
        isPatient: true,
      }) as never,
    );
  };

  const cancel = async () => {
    if (!accessToken || !request || cancelling) return;
    setCancelling(true);
    try {
      const updated = await cancelMedicalDocumentRequest(request.id, accessToken);
      setRequest((prev) => (prev ? { ...prev, ...updated } : updated));
      emit(MEDICAL_EVENTS.DOCUMENT_REQUEST_FULFILLED);
    } catch (err) {
      showAppAlert(
        isRTL ? "تعذر الإلغاء" : "Could not cancel",
        err instanceof Error ? err.message : undefined,
      );
    } finally {
      setCancelling(false);
    }
  };

  const Icon = request?.type === "lab" ? Beaker : ScanLine;
  const typeLabel =
    request?.type === "lab"
      ? isRTL
        ? "طلب تحليل"
        : "Lab request"
      : isRTL
        ? "طلب أشعة"
        : "X-ray request";

  const createdLabel = request?.created_at
    ? new Date(request.created_at).toLocaleDateString(localeTag(isRTL), {
        year: "numeric",
        month: "short",
        day: "numeric",
      })
    : "";

  return (
    <View style={[styles.screen, { backgroundColor: colors.background }]}>
      <View
        style={[
          styles.header,
          {
            flexDirection: dir,
            paddingTop: insets.top + 8,
            borderBottomColor: colors.border,
            backgroundColor: colors.card,
          },
        ]}
      >
        <AppBackButton
          color={colors.foreground}
          hitSlop={12}
          style={styles.backBtn}
          fallback="/(tabs)/records"
        />
        <Text
          style={[styles.headerTitle, { color: colors.foreground, textAlign }]}
          numberOfLines={1}
        >
          {isRTL ? "تفاصيل الطلب" : "Request details"}
        </Text>
        <View style={{ width: 36 }} />
      </View>

      {loading ? (
        <View style={styles.centered}>
          <ActivityIndicator color={colors.primary} />
        </View>
      ) : !request ? (
        <View style={styles.centered}>
          <Text style={{ color: colors.mutedForeground }}>
            {isRTL ? "الطلب غير موجود" : "Request not found"}
          </Text>
        </View>
      ) : (
        <KeyboardSafeScrollView
          contentContainerStyle={[styles.content, { paddingBottom: insets.bottom + 24 }]}
        >
          <View
            style={[
              styles.hero,
              {
                backgroundColor: colors.card,
                borderColor: colors.border,
                flexDirection: dir,
              },
            ]}
          >
            <View style={[styles.heroIcon, { backgroundColor: `${colors.primary}14` }]}>
              <Icon size={22} color={colors.primary} />
            </View>
            <View style={{ flex: 1 }}>
              <Text style={[styles.typeLabel, { color: colors.primary, textAlign }]}>
                {typeLabel}
              </Text>
              <Text style={[styles.title, { color: colors.foreground, textAlign }]}>
                {request.title}
              </Text>
              <View
                style={[
                  styles.statusPill,
                  {
                    alignSelf: isRTL ? "flex-end" : "flex-start",
                    backgroundColor:
                      request.status === "pending"
                        ? `${colors.primary}18`
                        : request.status === "fulfilled"
                          ? "#10b98122"
                          : "#ef444422",
                  },
                ]}
              >
                <Text
                  style={{
                    color:
                      request.status === "pending"
                        ? colors.primary
                        : request.status === "fulfilled"
                          ? "#059669"
                          : "#ef4444",
                    fontSize: 12,
                    fontWeight: "800",
                  }}
                >
                  {statusLabel(request.status, isRTL)}
                </Text>
              </View>
            </View>
          </View>

          {request.description ? (
            <View style={[styles.section, { backgroundColor: colors.card, borderColor: colors.border }]}>
              <Text style={[styles.sectionLabel, { color: colors.mutedForeground, textAlign }]}>
                {isRTL ? "الوصف" : "Description"}
              </Text>
              <Text style={[styles.sectionBody, { color: colors.foreground, textAlign }]}>
                {request.description}
              </Text>
            </View>
          ) : null}

          <View style={[styles.metaCard, { backgroundColor: colors.card, borderColor: colors.border }]}>
            {request.doctor_name ? (
              <View style={[styles.metaRow, { flexDirection: dir }]}>
                <User size={16} color={colors.mutedForeground} />
                <Text style={[styles.metaText, { color: colors.foreground, textAlign }]}>
                  {request.doctor_name}
                </Text>
              </View>
            ) : null}
            {createdLabel ? (
              <View style={[styles.metaRow, { flexDirection: dir }]}>
                <Calendar size={16} color={colors.mutedForeground} />
                <Text style={[styles.metaText, { color: colors.foreground, textAlign }]}>
                  {createdLabel}
                </Text>
              </View>
            ) : null}
            {patientUserId && isDoctor ? (
              <Text style={[styles.metaHint, { color: colors.mutedForeground, textAlign }]}>
                {isRTL ? "سجل المريض" : "Patient record request"}
              </Text>
            ) : null}
          </View>

          <View style={[styles.actions, { flexDirection: dir }]}>
            <Pressable
              onPress={() => void printPdf()}
              disabled={printing}
              style={[
                styles.actionBtn,
                {
                  borderColor: colors.primary,
                  backgroundColor: `${colors.primary}12`,
                  flex: 1,
                },
              ]}
            >
              {printing ? (
                <ActivityIndicator color={colors.primary} size="small" />
              ) : (
                <FileDown size={16} color={colors.primary} />
              )}
              <Text style={[styles.actionLabel, { color: colors.primary }]}>
                {t.records.printRequest}
              </Text>
            </Pressable>

            {isPatient && request.status === "pending" ? (
              <Pressable
                onPress={fulfill}
                style={[
                  styles.actionBtn,
                  {
                    borderColor: colors.primary,
                    backgroundColor: colors.primary,
                    flex: 1,
                  },
                ]}
              >
                <Upload size={16} color="#fff" />
                <Text style={[styles.actionLabel, { color: "#fff" }]}>
                  {request.type === "lab" ? t.records.addLab : t.records.addXray}
                </Text>
              </Pressable>
            ) : null}

            {isDoctor && request.status === "pending" ? (
              <Pressable
                onPress={() => void cancel()}
                disabled={cancelling}
                style={[
                  styles.actionBtn,
                  {
                    borderColor: "#ef4444",
                    backgroundColor: "#ef444412",
                    flex: 1,
                  },
                ]}
              >
                {cancelling ? (
                  <ActivityIndicator color="#ef4444" size="small" />
                ) : (
                  <XCircle size={16} color="#ef4444" />
                )}
                <Text style={[styles.actionLabel, { color: "#ef4444" }]}>
                  {isRTL ? "إلغاء الطلب" : "Cancel request"}
                </Text>
              </Pressable>
            ) : null}
          </View>
        </KeyboardSafeScrollView>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1 },
  header: {
    alignItems: "center",
    paddingHorizontal: 12,
    paddingBottom: 12,
    borderBottomWidth: StyleSheet.hairlineWidth,
    gap: 8,
  },
  backBtn: {
    width: 36,
    height: 36,
    alignItems: "center",
    justifyContent: "center",
  },
  headerTitle: { flex: 1, fontSize: 17, fontWeight: "800" },
  centered: { flex: 1, alignItems: "center", justifyContent: "center" },
  content: { padding: 16, gap: 12 },
  hero: {
    borderWidth: 1,
    borderRadius: 14,
    padding: 14,
    gap: 12,
    alignItems: "flex-start",
  },
  heroIcon: {
    width: 44,
    height: 44,
    borderRadius: 12,
    alignItems: "center",
    justifyContent: "center",
  },
  typeLabel: { fontSize: 12, fontWeight: "800", marginBottom: 4 },
  title: { fontSize: 18, fontWeight: "800", marginBottom: 8 },
  statusPill: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 8,
  },
  section: {
    borderWidth: 1,
    borderRadius: 14,
    padding: 14,
    gap: 6,
  },
  sectionLabel: { fontSize: 12, fontWeight: "700" },
  sectionBody: { fontSize: 14, lineHeight: 20 },
  metaCard: {
    borderWidth: 1,
    borderRadius: 14,
    padding: 14,
    gap: 10,
  },
  metaRow: { alignItems: "center", gap: 8 },
  metaText: { flex: 1, fontSize: 14, fontWeight: "600" },
  metaHint: { fontSize: 12 },
  actions: { gap: 10, marginTop: 4 },
  actionBtn: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    paddingVertical: 12,
    borderRadius: 12,
    borderWidth: 1,
  },
  actionLabel: { fontSize: 13, fontWeight: "800" },
});

export default MedicalDocumentRequestDetailScreen;
