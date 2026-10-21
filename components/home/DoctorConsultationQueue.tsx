import { router } from "expo-router";
import { ClipboardList, Inbox, MessageSquare } from "lucide-react-native";
import React from "react";
import { Platform, Pressable, StyleSheet, Text, View } from "react-native";
import { countryFlagEmoji } from "@/constants/patientCountries";
import {
  DASHBOARD_INDIGO,
  DASHBOARD_INDIGO_LIGHT,
} from "@/constants/dashboardTheme";
import { primaryButton, secondaryButton, surfaceCard, UI } from "@/constants/uiTokens";
import type { DoctorConsultation } from "@/domains/consultations/api";
import { useColors } from "@/hooks/useColors";
import { useI18n } from "@/hooks/useI18n";
import { useWebLayout } from "@/hooks/useWebLayout";
import { formatEgp } from "@/utils/credits";
import { alignText, flexRow } from "@/utils/rtl";

interface Props {
  consultations: DoctorConsultation[];
}

export function DoctorConsultationQueue({ consultations }: Props) {
  const colors = useColors();
  const { t, isRTL, locale } = useI18n();
  const { isDesktop } = useWebLayout();
  const dir = flexRow(isRTL);
  const textAlign = alignText(isRTL);

  const openChat = (patientId: string, consultationId?: string) => {
    router.push({
      pathname: "/chat/[id]",
      params: consultationId ? { id: patientId, consultationId } : { id: patientId },
    });
  };

  const openRecords = (patientId: string) => {
    router.push(`/patients/${patientId}`);
  };

  const titleRow = (
    <View style={[styles.titleRow, { flexDirection: dir }]}>
      <Text style={[styles.title, { color: colors.foreground, textAlign }]}>
        {t.doctorDashboard.consultationQueue}
      </Text>
      {consultations.length > 0 ? (
        <View style={[styles.countBadge, { backgroundColor: `${DASHBOARD_INDIGO}18` }]}>
          <Text style={{ color: DASHBOARD_INDIGO, fontSize: 12, fontWeight: "700" }}>
            {consultations.length > 99 ? "99+" : consultations.length}
          </Text>
        </View>
      ) : null}
    </View>
  );

  const emptyState = (
    <View
      style={[
        styles.emptyState,
        {
          backgroundColor: DASHBOARD_INDIGO_LIGHT,
          borderColor: `${DASHBOARD_INDIGO}30`,
        },
      ]}
    >
      <View style={[styles.emptyIconWrap, { backgroundColor: `${DASHBOARD_INDIGO}14` }]}>
        <Inbox size={22} color={DASHBOARD_INDIGO} />
      </View>
      <Text style={[styles.emptyTitle, { color: colors.foreground, textAlign }]}>
        {t.doctorDashboard.consultationQueue}
      </Text>
      <Text style={[styles.emptyText, { color: colors.mutedForeground, textAlign }]}>
        {t.doctorDashboard.consultationQueueEmpty}
      </Text>
    </View>
  );

  if (isDesktop) {
    return (
      <View
        style={[
          styles.wrap,
          surfaceCard(colors.card, colors.border),
          { marginHorizontal: 16 },
          Platform.select({
            web: {
              boxShadow:
                "0 1px 3px rgba(79,70,229,0.06), inset 0 0 0 1px rgba(79,70,229,0.08)",
            },
            default: {},
          }),
        ]}
      >
        {titleRow}

        {consultations.length === 0 ? (
          emptyState
        ) : (
          <View style={styles.list}>
            <View
              style={[
                styles.tableHeader,
                { flexDirection: dir, backgroundColor: `${DASHBOARD_INDIGO}08` },
              ]}
            >
              <Text
                style={[
                  styles.tableHeaderCell,
                  styles.colPatient,
                  { color: colors.mutedForeground, textAlign },
                ]}
              >
                Patient
              </Text>
              <Text
                style={[
                  styles.tableHeaderCell,
                  styles.colStatus,
                  { color: colors.mutedForeground, textAlign },
                ]}
              >
                Status
              </Text>
              <Text
                style={[
                  styles.tableHeaderCell,
                  styles.colDate,
                  { color: colors.mutedForeground, textAlign },
                ]}
              >
                Requested
              </Text>
              <Text
                style={[
                  styles.tableHeaderCell,
                  styles.colActions,
                  { color: colors.mutedForeground, textAlign },
                ]}
              >
                Actions
              </Text>
            </View>

            {consultations.map((item) => {
              const date = new Date(item.created_at).toLocaleDateString(
                locale === "ar" ? "ar-EG" : "en-US",
              );

              return (
                <View
                  key={item.id}
                  style={[
                    styles.tableRow,
                    { flexDirection: dir, borderBottomColor: `${colors.border}80` },
                  ]}
                >
                  <View style={[styles.colPatient, styles.cellPatient]}>
                    <Text
                      style={[styles.rowName, { color: colors.foreground, textAlign }]}
                      numberOfLines={1}
                    >
                      {item.patient_country ? `${countryFlagEmoji(item.patient_country)} ` : ""}
                      {item.patient_name}
                    </Text>
                    {item.description ? (
                      <Text
                        style={[styles.rowDesc, { color: colors.mutedForeground, textAlign }]}
                        numberOfLines={1}
                      >
                        {item.description}
                      </Text>
                    ) : null}
                  </View>
                  <View style={styles.colStatus}>
                    <View style={[styles.statusBadge, { backgroundColor: `${DASHBOARD_INDIGO}14` }]}>
                      <Text style={{ color: DASHBOARD_INDIGO, fontSize: 10, fontWeight: "700" }}>
                        {t.doctorDashboard.active}
                      </Text>
                    </View>
                  </View>
                  <Text
                    style={[
                      styles.colDate,
                      styles.rowMeta,
                      { color: colors.mutedForeground, textAlign },
                    ]}
                  >
                    {date} · {formatEgp(item.reserved_points, t)}
                  </Text>
                  <View style={[styles.colActions, styles.rowActions, { flexDirection: dir }]}>
                    <Pressable
                      onPress={() => openChat(item.patient_id, item.id)}
                      style={({ pressed }) => [
                        styles.tableBtn,
                        primaryButton(),
                        {
                          backgroundColor: DASHBOARD_INDIGO,
                          opacity: pressed ? 0.88 : 1,
                          flexDirection: dir,
                        },
                      ]}
                    >
                      <MessageSquare size={13} color="#fff" />
                      <Text style={[styles.tableBtnText, { color: "#fff" }]}>
                        {t.doctorDashboard.openChat}
                      </Text>
                    </Pressable>
                    <Pressable
                      onPress={() => openRecords(item.patient_id)}
                      style={({ pressed }) => [
                        styles.tableBtn,
                        secondaryButton(`${DASHBOARD_INDIGO}40`, colors.card),
                        { opacity: pressed ? 0.9 : 1, flexDirection: dir },
                      ]}
                    >
                      <ClipboardList size={13} color={DASHBOARD_INDIGO} />
                    </Pressable>
                  </View>
                </View>
              );
            })}
          </View>
        )}
      </View>
    );
  }

  return (
    <View style={styles.mobileSection}>
      {titleRow}

      {consultations.length === 0 ? (
        emptyState
      ) : (
        <View style={styles.mobileList}>
          {consultations.map((item) => {
            const date = new Date(item.created_at).toLocaleDateString(
              locale === "ar" ? "ar-EG" : "en-US",
            );

            return (
              <View
                key={item.id}
                style={[
                  styles.mobileCard,
                  {
                    backgroundColor: colors.card,
                    borderColor: colors.border,
                  },
                  Platform.OS === "ios"
                    ? {
                        shadowColor: "#0f172a",
                        shadowOffset: { width: 0, height: 2 },
                        shadowOpacity: 0.06,
                        shadowRadius: 8,
                      }
                    : null,
                ]}
              >
                <View style={[styles.mobileCardHeader, { flexDirection: dir }]}>
                  <Text
                    style={[styles.mobileName, { color: colors.foreground, textAlign }]}
                    numberOfLines={1}
                  >
                    {item.patient_country ? `${countryFlagEmoji(item.patient_country)} ` : ""}
                    {item.patient_name}
                  </Text>
                  <View style={[styles.statusBadge, { backgroundColor: `${DASHBOARD_INDIGO}14` }]}>
                    <Text style={{ color: DASHBOARD_INDIGO, fontSize: 11, fontWeight: "700" }}>
                      {t.doctorDashboard.active}
                    </Text>
                  </View>
                </View>

                {item.description ? (
                  <Text
                    style={[styles.mobilePreview, { color: colors.mutedForeground, textAlign }]}
                    numberOfLines={2}
                  >
                    {item.description}
                  </Text>
                ) : null}

                <View style={[styles.mobileMetaRow, { flexDirection: dir }]}>
                  <Text style={[styles.mobileMetaText, { color: colors.mutedForeground, textAlign }]}>
                    {date}
                  </Text>
                  <View style={[styles.metaDot, { backgroundColor: colors.mutedForeground }]} />
                  <Text style={[styles.mobileMetaText, { color: colors.mutedForeground, textAlign }]}>
                    {formatEgp(item.reserved_points, t)}
                  </Text>
                </View>

                <View style={[styles.mobileActions, { flexDirection: dir }]}>
                  <Pressable
                    onPress={() => openChat(item.patient_id, item.id)}
                    accessibilityRole="button"
                    style={({ pressed }) => [
                      styles.mobileActionBtn,
                      primaryButton(),
                      {
                        backgroundColor: DASHBOARD_INDIGO,
                        opacity: pressed ? 0.88 : 1,
                        flexDirection: dir,
                      },
                    ]}
                  >
                    <MessageSquare size={16} color="#fff" />
                    <Text style={[styles.mobileActionText, { color: "#fff" }]} numberOfLines={1}>
                      {t.doctorDashboard.openChat}
                    </Text>
                  </Pressable>
                  <Pressable
                    onPress={() => openRecords(item.patient_id)}
                    accessibilityRole="button"
                    style={({ pressed }) => [
                      styles.mobileActionBtn,
                      secondaryButton(`${DASHBOARD_INDIGO}35`, colors.card),
                      { opacity: pressed ? 0.9 : 1, flexDirection: dir },
                    ]}
                  >
                    <ClipboardList size={16} color={DASHBOARD_INDIGO} />
                    <Text
                      style={[styles.mobileActionText, { color: DASHBOARD_INDIGO }]}
                      numberOfLines={1}
                    >
                      {t.doctorDashboard.viewRecords}
                    </Text>
                  </Pressable>
                </View>
              </View>
            );
          })}
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: {
    paddingHorizontal: 14,
    paddingVertical: 12,
    gap: 10,
    marginTop: 16,
    marginBottom: 20,
  },
  mobileSection: {
    marginHorizontal: 16,
    marginTop: 12,
    marginBottom: 8,
    gap: 12,
  },
  titleRow: {
    alignItems: "center",
    gap: 8,
  },
  title: {
    fontSize: 16,
    fontWeight: "700",
    letterSpacing: -0.2,
    flex: 1,
  },
  countBadge: {
    minWidth: 26,
    height: 26,
    borderRadius: 13,
    paddingHorizontal: 8,
    alignItems: "center",
    justifyContent: "center",
  },
  emptyState: {
    alignItems: "center",
    gap: 6,
    paddingVertical: 24,
    paddingHorizontal: 16,
    borderRadius: UI.radius.inner,
    borderWidth: 1,
    borderStyle: "dashed",
  },
  emptyIconWrap: {
    width: 44,
    height: 44,
    borderRadius: 22,
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 2,
  },
  emptyTitle: {
    fontSize: 14,
    fontWeight: "700",
  },
  emptyText: {
    fontSize: 13,
    lineHeight: 18,
    maxWidth: 360,
  },
  list: {
    gap: 0,
    borderRadius: UI.radius.inner,
    overflow: "hidden",
  },
  mobileList: {
    gap: 12,
  },
  tableHeader: {
    paddingHorizontal: 10,
    paddingVertical: 7,
    borderRadius: UI.radius.inner,
    marginBottom: 2,
  },
  tableHeaderCell: {
    fontSize: 10,
    fontWeight: "700",
    textTransform: "uppercase",
    letterSpacing: 0.4,
  },
  tableRow: {
    alignItems: "center",
    paddingHorizontal: 10,
    paddingVertical: 10,
    borderBottomWidth: StyleSheet.hairlineWidth,
    gap: 8,
  },
  colPatient: {
    flex: 3,
    minWidth: 0,
  },
  colStatus: {
    flex: 1,
    minWidth: 72,
    alignItems: "flex-start",
  },
  colDate: {
    flex: 2,
    minWidth: 100,
  },
  colActions: {
    flex: 2,
    minWidth: 140,
  },
  cellPatient: {
    gap: 2,
  },
  rowName: {
    fontSize: 13,
    fontWeight: "600",
  },
  rowDesc: {
    fontSize: 11,
    lineHeight: 15,
  },
  rowMeta: {
    fontSize: 11,
    lineHeight: 15,
  },
  rowActions: {
    justifyContent: "flex-end",
    gap: 6,
  },
  tableBtn: {
    flexDirection: "row",
    alignItems: "center",
    gap: 5,
    paddingHorizontal: 10,
    minHeight: 32,
    paddingVertical: 6,
    borderRadius: UI.radius.inner,
  },
  tableBtnText: {
    fontSize: 11,
    fontWeight: "600",
  },
  mobileCard: {
    borderWidth: StyleSheet.hairlineWidth,
    borderRadius: 16,
    padding: 14,
    gap: 10,
  },
  mobileCardHeader: {
    alignItems: "center",
    gap: 10,
  },
  mobileName: {
    flex: 1,
    fontSize: 16,
    fontWeight: "700",
    letterSpacing: -0.2,
  },
  mobilePreview: {
    fontSize: 14,
    lineHeight: 20,
  },
  mobileMetaRow: {
    alignItems: "center",
    gap: 8,
  },
  mobileMetaText: {
    fontSize: 12,
    fontWeight: "500",
  },
  metaDot: {
    width: 3,
    height: 3,
    borderRadius: 1.5,
    opacity: 0.5,
  },
  statusBadge: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: UI.radius.chip,
  },
  mobileActions: {
    gap: 8,
    marginTop: 2,
  },
  mobileActionBtn: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 6,
    minHeight: 44,
    paddingHorizontal: 10,
    borderRadius: 12,
  },
  mobileActionText: {
    fontSize: 13,
    fontWeight: "600",
    flexShrink: 1,
  },
});
