import { router } from "expo-router";
import { Check, FileText, MessageCircle, Stethoscope } from "lucide-react-native";
import React, { useEffect, useMemo, useState } from "react";
import {
  ActivityIndicator,
  Platform,
  Pressable,
  StyleSheet,
  Text,
  View,
} from "react-native";
import { useAsk3elagiAiWidgetStore } from "@/domains/ai/widget-store";
import { useAuthStore } from "@/domains/auth/store";
import { useChatStore } from "@/domains/chat/store";
import { startConsultation } from "@/domains/consultations/api";
import {
  selectPointsBalance,
  usePointsStore,
} from "@/domains/points/store";
import { primaryButton, surfaceCard, UI } from "@/constants/uiTokens";
import { useColors } from "@/hooks/useColors";
import { useI18n } from "@/hooks/useI18n";
import { formatEgp } from "@/utils/credits";
import type { ConsultationDirective } from "@/utils/assistantConsultation";
import { chatFlexRow } from "@/utils/rtl";

interface Props {
  directive: ConsultationDirective;
}

export function AiConsultationCard({ directive }: Props) {
  const colors = useColors();
  const { isRTL } = useI18n();
  const dir = chatFlexRow();
  const token = useAuthStore((s) => s.accessToken);
  const profile = useAuthStore((s) => s.profile);
  const role = useAuthStore((s) => s.role);
  const isPatient = role?.toLowerCase() === "patient";
  const closeWidget = useAsk3elagiAiWidgetStore((s) => s.closeWidget);
  const sendMessage = useChatStore((s) => s.sendMessage);
  const summary = usePointsStore((s) => s.summary);
  const loadPoints = usePointsStore((s) => s.loadPoints);
  const balance = selectPointsBalance(summary);
  const price = Math.min(100_000, Math.max(1, directive.price ?? 1));
  const hasEnoughCredits = balance >= price;

  const suggestedRecords = useMemo(() => directive.records ?? [], [directive.records]);
  const [selectedIds, setSelectedIds] = useState<Set<string>>(
    () => new Set(suggestedRecords.map((r) => r.recordId)),
  );
  const [starting, setStarting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [started, setStarted] = useState(false);

  useEffect(() => {
    setSelectedIds(new Set(suggestedRecords.map((r) => r.recordId)));
  }, [suggestedRecords]);

  useEffect(() => {
    if (token && isPatient) void loadPoints(token);
  }, [token, isPatient, loadPoints]);

  if (!isPatient) return null;

  const toggleRecord = (recordId: string) => {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (next.has(recordId)) next.delete(recordId);
      else next.add(recordId);
      return next;
    });
  };

  const handleStart = async () => {
    if (!token || !profile?.id || starting) return;
    setStarting(true);
    setError(null);
    try {
      await startConsultation(
        directive.doctorUserId,
        directive.description ?? "",
        token,
      );
      const selected = suggestedRecords.filter((r) => selectedIds.has(r.recordId));
      for (const record of selected) {
        await sendMessage(
          directive.doctorUserId,
          {
            recipientId: directive.doctorUserId,
            type: "medical_link",
            content: record.title,
            medicalLink: {
              record_type: record.recordType,
              record_id: record.recordId,
              title: record.title,
            },
          },
          token,
          profile.id,
          role ?? "patient",
        ).catch(() => undefined);
      }
      await loadPoints(token);
      setStarted(true);
      closeWidget();
      router.push(`/chat/${directive.doctorUserId}`);
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setStarting(false);
    }
  };

  if (started) {
    return (
      <View style={[styles.card, surfaceCard(colors.card, colors.border), styles.accent, { borderLeftColor: colors.primary }]}>
        <View style={[styles.confirmedRow, { flexDirection: dir }]}>
          <Check size={16} color={colors.primary} />
          <Text style={[styles.confirmedText, { color: colors.foreground, textAlign: isRTL ? "right" : "left" }]}>
            {isRTL
              ? `تم بدء الاستشارة مع ${directive.doctorName ?? "الطبيب"}`
              : `Consultation started with ${directive.doctorName ?? "the doctor"}`}
          </Text>
        </View>
      </View>
    );
  }

  const selectedCount = suggestedRecords.filter((r) => selectedIds.has(r.recordId)).length;

  return (
    <View
      style={[
        styles.card,
        surfaceCard(colors.card, colors.border),
        styles.accent,
        { borderLeftColor: colors.primary },
      ]}
    >
      <View style={[styles.header, { flexDirection: dir }]}>
        <View style={[styles.iconWrap, { backgroundColor: `${colors.primary}12` }]}>
          <Stethoscope size={16} color={colors.primary} />
        </View>
        <View style={styles.headerText}>
          <Text style={[styles.kicker, { color: colors.primary, textAlign: isRTL ? "right" : "left" }]}>
            {isRTL ? "توصية استشارة" : "Consultation recommendation"}
          </Text>
          <Text style={[styles.doctorName, { color: colors.foreground, textAlign: isRTL ? "right" : "left" }]}>
            {directive.doctorName ?? (isRTL ? "طبيب" : "Doctor")}
          </Text>
        </View>
      </View>

      {directive.description ? (
        <Text style={[styles.description, { color: colors.mutedForeground, textAlign: isRTL ? "right" : "left" }]}>
          {directive.description}
        </Text>
      ) : null}

      {suggestedRecords.length > 0 ? (
        <View style={styles.recordsBlock}>
          <Text style={[styles.sectionLabel, { color: colors.mutedForeground, textAlign: isRTL ? "right" : "left" }]}>
            {isRTL ? "السجلات المقترحة" : "Suggested records"}
          </Text>
          {suggestedRecords.map((record) => {
            const selected = selectedIds.has(record.recordId);
            return (
              <Pressable
                key={record.recordId}
                onPress={() => toggleRecord(record.recordId)}
                style={[
                  styles.recordRow,
                  {
                    flexDirection: dir,
                    backgroundColor: selected ? `${colors.primary}08` : colors.background,
                  },
                ]}
              >
                <View
                  style={[
                    styles.checkbox,
                    {
                      borderColor: selected ? colors.primary : colors.border,
                      backgroundColor: selected ? colors.primary : "transparent",
                    },
                  ]}
                >
                  {selected ? <Check size={10} color="#fff" /> : null}
                </View>
                <FileText size={14} color={selected ? colors.primary : colors.mutedForeground} />
                <Text
                  style={[
                    styles.recordTitle,
                    { color: colors.foreground, textAlign: isRTL ? "right" : "left" },
                  ]}
                  numberOfLines={1}
                >
                  {record.title}
                </Text>
              </Pressable>
            );
          })}
          <Text style={[styles.attachHint, { color: colors.mutedForeground, textAlign: isRTL ? "right" : "left" }]}>
            {isRTL
              ? `${selectedCount} سجل مرفق`
              : `${selectedCount} record${selectedCount === 1 ? "" : "s"} attached`}
          </Text>
        </View>
      ) : null}

      <View style={[styles.footer, { flexDirection: dir }]}>
        <Text style={[styles.price, { color: colors.foreground }]}>
          {formatEgp(price)}
          <Text style={{ color: colors.mutedForeground, fontWeight: "500" }}>
            {isRTL ? " · محجوز من رصيدك" : " · reserved"}
          </Text>
        </Text>
      </View>

      {!hasEnoughCredits ? (
        <Text style={[styles.errorInline, { color: colors.destructive, textAlign: isRTL ? "right" : "left" }]}>
          {isRTL ? `رصيد غير كافٍ (${formatEgp(balance)})` : `Insufficient credits (${formatEgp(balance)})`}
        </Text>
      ) : null}

      <Pressable
        onPress={() => void handleStart()}
        disabled={starting || !hasEnoughCredits}
        style={[
          primaryButton(),
          styles.confirmBtn,
          {
            backgroundColor: colors.primary,
            opacity: starting || !hasEnoughCredits ? 0.55 : 1,
          },
        ]}
      >
        {starting ? (
          <ActivityIndicator color="#fff" />
        ) : (
          <>
            <MessageCircle size={15} color="#fff" />
            <Text style={styles.confirmBtnText}>
              {isRTL ? "تأكيد وبدء المحادثة" : "Confirm & open chat"}
            </Text>
          </>
        )}
      </Pressable>

      {error ? (
        <Text style={[styles.errorInline, { color: colors.destructive, textAlign: "center" }]}>{error}</Text>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    marginTop: UI.space.sm,
    padding: UI.space.md,
    gap: UI.space.sm,
    maxWidth: 520,
    ...Platform.select({
      web: { transition: "box-shadow 180ms ease" } as object,
      default: {},
    }),
  },
  accent: {
    borderLeftWidth: 3,
  },
  header: {
    alignItems: "center",
    gap: UI.space.sm,
  },
  iconWrap: {
    width: 32,
    height: 32,
    borderRadius: UI.radius.icon,
    alignItems: "center",
    justifyContent: "center",
  },
  headerText: {
    flex: 1,
    gap: 2,
  },
  kicker: {
    fontSize: 11,
    fontWeight: "800",
    letterSpacing: 0.4,
    textTransform: "uppercase",
  },
  doctorName: {
    fontSize: 16,
    fontWeight: "800",
    letterSpacing: -0.2,
    lineHeight: 21,
  },
  description: {
    fontSize: 13,
    lineHeight: 19,
    fontWeight: "500",
  },
  recordsBlock: {
    gap: 6,
  },
  sectionLabel: {
    fontSize: 11,
    fontWeight: "700",
    textTransform: "uppercase",
    letterSpacing: 0.3,
  },
  recordRow: {
    alignItems: "center",
    gap: 8,
    borderRadius: UI.radius.inner,
    paddingHorizontal: 8,
    paddingVertical: 7,
  },
  checkbox: {
    width: 16,
    height: 16,
    borderRadius: 4,
    borderWidth: 1.5,
    alignItems: "center",
    justifyContent: "center",
  },
  recordTitle: {
    flex: 1,
    fontSize: 12,
    fontWeight: "700",
    lineHeight: 16,
  },
  attachHint: {
    fontSize: 11,
    fontWeight: "600",
  },
  footer: {
    alignItems: "center",
    justifyContent: "space-between",
  },
  price: {
    fontSize: 14,
    fontWeight: "800",
  },
  confirmBtn: {
    flexDirection: "row",
    gap: 6,
    marginTop: 2,
  },
  confirmBtnText: {
    color: "#fff",
    fontWeight: "800",
    fontSize: 14,
  },
  confirmedRow: {
    alignItems: "center",
    gap: 8,
  },
  confirmedText: {
    flex: 1,
    fontSize: 13,
    fontWeight: "600",
    lineHeight: 18,
  },
  errorInline: {
    fontSize: 12,
    fontWeight: "600",
  },
});
