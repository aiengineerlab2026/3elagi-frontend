import { useFocusEffect } from "@react-navigation/native";
import { router } from "expo-router";
import { Beaker, ChevronDown, ChevronUp, Info, ScanLine } from "lucide-react-native";
import React, { useCallback, useEffect, useState } from "react";
import {
  ActivityIndicator,
  Pressable,
  StyleSheet,
  Text,
  View,
} from "react-native";
import {
  fetchMedicalDocumentRequestsForPatientAsDoctor,
  fetchMyMedicalDocumentRequests,
  type MedicalDocumentRequest,
} from "@/domains/medical/api";
import { MEDICAL_EVENTS } from "@/domains/medical/events";
import { useAuthStore } from "@/domains/auth/store";
import { useColors } from "@/hooks/useColors";
import { useI18n } from "@/hooks/useI18n";
import { on } from "@/utils/eventBus";
import { flexRow } from "@/utils/rtl";

interface Props {
  /**
   * When set (doctor viewing a patient), load that patient's pending requests.
   * When omitted, loads the signed-in patient's own pending requests.
   */
  patientUserId?: string;
  /** Flush margins for dashboard / split-pane layouts. */
  embedded?: boolean;
}

export function PatientMedicalRequestsPanel({ patientUserId, embedded = false }: Props) {
  const colors = useColors();
  const { t, isRTL } = useI18n();
  const dir = flexRow(isRTL);
  const accessToken = useAuthStore((s) => s.accessToken);
  const role = useAuthStore((s) => s.role);
  const isPatient = role?.toLowerCase() === "patient";
  const isDoctor = role?.toLowerCase() === "doctor";
  const doctorViewingPatient = isDoctor && !!patientUserId?.trim();
  const [items, setItems] = useState<MedicalDocumentRequest[]>([]);
  const [loading, setLoading] = useState(true);
  const [open, setOpen] = useState(false);
  const accent = colors.info;

  const load = useCallback(async () => {
    if (!accessToken) {
      setItems([]);
      setLoading(false);
      return;
    }
    if (!isPatient && !doctorViewingPatient) {
      setItems([]);
      setLoading(false);
      return;
    }
    setLoading(true);
    try {
      const rows = doctorViewingPatient
        ? await fetchMedicalDocumentRequestsForPatientAsDoctor(
            patientUserId!.trim(),
            accessToken,
          )
        : await fetchMyMedicalDocumentRequests(accessToken);
      setItems(rows.filter((r) => r.status === "pending"));
    } catch {
      setItems([]);
    } finally {
      setLoading(false);
    }
  }, [accessToken, isPatient, doctorViewingPatient, patientUserId]);

  useFocusEffect(
    useCallback(() => {
      void load();
    }, [load]),
  );

  useEffect(() => {
    return on(MEDICAL_EVENTS.DOCUMENT_REQUEST_FULFILLED, () => {
      void load();
    });
  }, [load]);

  if (!isPatient && !doctorViewingPatient) return null;

  if (loading) {
    return (
      <View style={styles.loading}>
        <ActivityIndicator color={accent} />
      </View>
    );
  }

  if (items.length === 0) return null;

  const openDetail = (request: MedicalDocumentRequest) => {
    router.push({
      pathname: "/medical/request/[id]",
      params: {
        id: request.id,
        ...(doctorViewingPatient
          ? { patientUserId: patientUserId!.trim() }
          : {}),
      },
    } as never);
  };

  return (
    <View style={[styles.wrap, embedded && styles.wrapEmbedded]}>
      <View
        style={[
          styles.categoryCard,
          {
            flexDirection: dir,
            backgroundColor: `${accent}14`,
            borderColor: accent,
          },
        ]}
      >
        <Pressable
          onPress={() => setOpen((prev) => !prev)}
          style={[styles.categoryTogglePart, { flexDirection: dir }]}
        >
          <View style={[styles.iconBubble, { backgroundColor: `${accent}22` }]}>
            <Info size={16} color={accent} />
          </View>
          <Text style={[styles.categoryLabel, { color: accent }]}>
            {t.records.pendingRequests}
          </Text>
          <View style={[styles.countBadge, { backgroundColor: accent }]}>
            <Text style={[styles.categoryCount, { color: "#fff" }]}>{items.length}</Text>
          </View>
          {open ? (
            <ChevronUp size={16} color={accent} />
          ) : (
            <ChevronDown size={16} color={accent} />
          )}
        </Pressable>
      </View>

      {open ? (
        <View style={styles.list}>
          {items.map((item) => {
            const Icon = item.type === "lab" ? Beaker : ScanLine;
            return (
              <Pressable
                key={item.id}
                onPress={() => openDetail(item)}
                style={({ pressed }) => [
                  styles.row,
                  {
                    borderColor: `${accent}55`,
                    backgroundColor: `${accent}0A`,
                    opacity: pressed ? 0.88 : 1,
                  },
                ]}
              >
                <View style={[styles.rowTop, { flexDirection: dir }]}>
                  <View style={[styles.rowIcon, { backgroundColor: `${accent}18` }]}>
                    <Icon size={16} color={accent} />
                  </View>
                  <View style={{ flex: 1 }}>
                    <Text
                      style={[styles.itemTitle, { color: colors.foreground }]}
                      numberOfLines={2}
                    >
                      {item.title}
                    </Text>
                    <Text
                      style={[styles.itemType, { color: colors.mutedForeground }]}
                      numberOfLines={1}
                    >
                      {item.type === "lab"
                        ? isRTL
                          ? "طلب تحليل"
                          : "Lab request"
                        : isRTL
                          ? "طلب أشعة"
                          : "X-ray request"}
                    </Text>
                    {item.description ? (
                      <Text
                        style={[styles.itemDesc, { color: colors.mutedForeground }]}
                        numberOfLines={2}
                      >
                        {item.description}
                      </Text>
                    ) : null}
                  </View>
                </View>
              </Pressable>
            );
          })}
        </View>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  loading: { paddingVertical: 8 },
  wrap: {
    marginTop: 8,
    marginBottom: 4,
    marginHorizontal: 16,
    gap: 8,
    flexShrink: 0,
  },
  wrapEmbedded: {
    marginHorizontal: 0,
    marginTop: 0,
    marginBottom: 0,
  },
  categoryCard: {
    borderRadius: 14,
    borderWidth: 1.5,
    paddingHorizontal: 12,
    paddingVertical: 10,
    alignItems: "center",
  },
  categoryTogglePart: {
    flex: 1,
    alignItems: "center",
    gap: 10,
  },
  iconBubble: {
    width: 32,
    height: 32,
    borderRadius: 8,
    alignItems: "center",
    justifyContent: "center",
  },
  categoryLabel: { flex: 1, fontSize: 14, fontWeight: "800" },
  countBadge: {
    minWidth: 24,
    height: 24,
    borderRadius: 8,
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: 6,
  },
  categoryCount: { fontSize: 12, fontWeight: "800" },
  list: { gap: 8 },
  row: {
    borderRadius: 12,
    borderWidth: 1,
    padding: 12,
  },
  rowTop: { alignItems: "flex-start", gap: 10 },
  rowIcon: {
    width: 32,
    height: 32,
    borderRadius: 8,
    alignItems: "center",
    justifyContent: "center",
  },
  itemTitle: { fontSize: 14, fontWeight: "800" },
  itemType: { fontSize: 11, fontWeight: "700", marginTop: 2 },
  itemDesc: { fontSize: 12, marginTop: 4, lineHeight: 16 },
});
