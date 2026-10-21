import { useFocusEffect } from "@react-navigation/native";
import { Redirect, router } from "expo-router";
import React, { useCallback, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  FlatList,
  Platform,
  Pressable,
  StyleSheet,
  Text,
  View,
} from "react-native";
import { CalendarClock, X } from "lucide-react-native";
import { VideoAppointmentPaymentPanel } from "@/components/consultations/VideoAppointmentPaymentPanel";
import {
  videoAppointmentNeedsPaymentPanel,
  videoAppointmentPaymentBadge,
} from "@/components/consultations/videoAppointmentPaymentMeta";
import { AppHeader } from "@/components/AppHeader";
import {
  cancelAppointment,
  fetchMyAppointments,
  type UpcomingAppointment,
} from "@/domains/appointments/api";
import { useAuthStore } from "@/domains/auth/store";
import { isSignedIn } from "@/domains/auth/session";
import { useColors } from "@/hooks/useColors";
import { useI18n } from "@/hooks/useI18n";
import { appointmentRoomState } from "@/domains/appointments/roomWindow";
import { showInfoToast } from "@/utils/toast";

const STATUS_COLORS: Record<string, string> = {
  pending: "#f59e0b",
  confirmed: "#22c55e",
  waiting: "#3b82f6",
  active: "#8b5cf6",
};

function statusLabel(status: string, isRTL: boolean): string {
  const map: Record<string, { en: string; ar: string }> = {
    pending: { en: "Pending", ar: "معلّق" },
    confirmed: { en: "Confirmed", ar: "مؤكد" },
    waiting: { en: "Waiting", ar: "بالانتظار" },
    active: { en: "Active", ar: "نشط" },
  };
  const entry = map[status];
  return entry ? (isRTL ? entry.ar : entry.en) : status;
}

export default function AppointmentsTab() {
  const colors = useColors();
  const { t, isRTL } = useI18n();
  const profile = useAuthStore((s) => s.profile);
  const accessToken = useAuthStore((s) => s.accessToken);
  const role = useAuthStore((s) => s.role);

  const [appointments, setAppointments] = useState<UpcomingAppointment[]>([]);
  const [loading, setLoading] = useState(true);
  const [cancelling, setCancelling] = useState<string | null>(null);

  const load = useCallback(async () => {
    if (!accessToken) return;
    setLoading(true);
    try {
      const data = await fetchMyAppointments(accessToken);
      setAppointments(data);
    } catch {
      setAppointments([]);
    } finally {
      setLoading(false);
    }
  }, [accessToken]);

  useFocusEffect(
    useCallback(() => {
      void load();
    }, [load]),
  );

  const handleCancel = (appt: UpcomingAppointment) => {
    const title = isRTL ? "إلغاء الموعد" : "Cancel appointment";
    const msg = isRTL
      ? `هل تريد إلغاء الموعد مع ${appt.other_name}؟`
      : `Cancel appointment with ${appt.other_name}?`;

    if (Platform.OS === "web") {
      if (!confirm(msg)) return;
      void doCancel(appt.id);
    } else {
      Alert.alert(title, msg, [
        { text: isRTL ? "لا" : "No", style: "cancel" },
        {
          text: isRTL ? "إلغاء الموعد" : "Cancel it",
          style: "destructive",
          onPress: () => void doCancel(appt.id),
        },
      ]);
    }
  };

  const doCancel = async (id: string) => {
    if (!accessToken) return;
    setCancelling(id);
    try {
      await cancelAppointment(accessToken, id);
      setAppointments((prev) => prev.filter((a) => a.id !== id));
    } catch (e) {
      Alert.alert(isRTL ? "خطأ" : "Error", (e as Error).message);
    } finally {
      setCancelling(null);
    }
  };

  if (!isSignedIn(profile, accessToken) || !role) {
    return <Redirect href="/welcome" />;
  }

  const isDoctor = role.toLowerCase() === "doctor";
  const dir = isRTL ? "row-reverse" : "row";

  const renderItem = ({ item }: { item: UpcomingAppointment }) => {
    const date = new Date(item.date);
    const dateStr = date.toLocaleDateString(isRTL ? "ar-EG" : "en-US", {
      weekday: "short",
      month: "short",
      day: "numeric",
    });
    const sColor = STATUS_COLORS[item.status] ?? colors.mutedForeground;
    const isCancelling = cancelling === item.id;
    const paymentBadge = videoAppointmentPaymentBadge(item, isDoctor, t, colors);
    const showPayment = videoAppointmentNeedsPaymentPanel(item);
    const statusColor = paymentBadge?.color ?? sColor;

    return (
      <View
        style={[
          styles.cardOuter,
          {
            backgroundColor: colors.card,
            borderColor: paymentBadge ? `${paymentBadge.color}44` : colors.border,
          },
        ]}
      >
        <View style={[styles.card, { flexDirection: dir }]}>
        <View style={[styles.dateBox, { backgroundColor: `${colors.primary}12` }]}>
          <Text style={[styles.dateDay, { color: colors.primary }]}>{date.getDate()}</Text>
          <Text style={[styles.dateMonth, { color: colors.primary }]}>
            {date.toLocaleDateString(isRTL ? "ar-EG" : "en-US", { month: "short" })}
          </Text>
        </View>

        <View style={[styles.info, { alignItems: isRTL ? "flex-end" : "flex-start" }]}>
          <Text style={[styles.name, { color: colors.foreground }]}>{item.other_name}</Text>
          <Text style={{ color: colors.mutedForeground, fontSize: 13 }}>
            {dateStr}{item.time ? ` · ${item.time.slice(0, 5)}` : ""}
          </Text>
          <View style={[styles.statusRow, { flexDirection: dir }]}>
            <View style={[styles.statusDot, { backgroundColor: statusColor }]} />
            <Text style={{ color: statusColor, fontSize: 12, fontWeight: "600" }}>
              {paymentBadge ? paymentBadge.label : statusLabel(item.status, isRTL)}
            </Text>
          </View>
          {item.ai_patient_insight ? (
            <View
              style={{
                marginTop: 8,
                borderWidth: 1,
                borderColor: colors.primary,
                backgroundColor: colors.card,
                borderRadius: 10,
                paddingHorizontal: 10,
                paddingVertical: 8,
                alignSelf: "stretch",
              }}
            >
              <Text
                style={{
                  color: colors.primary,
                  fontSize: 11,
                  fontWeight: "800",
                  marginBottom: 4,
                  textAlign: isRTL ? "right" : "left",
                }}
              >
                {isRTL ? "ملخص الذكاء الاصطناعي عن المريض" : "AI patient insight"}
              </Text>
              <Text
                style={{
                  color: colors.foreground,
                  fontSize: 12.5,
                  lineHeight: 18,
                  textAlign: isRTL ? "right" : "left",
                }}
              >
                {item.ai_patient_insight}
              </Text>
            </View>
          ) : null}
          {item.meeting_link &&
          appointmentRoomState(item.date, item.time, item.duration_minutes) !== "over" ? (
            <View style={styles.linkWrap}>
              <Pressable
                onPress={() => {
                  // Booked rooms are live only for their slot; outside it the
                  // tap explains why instead of opening an empty meeting.
                  const state = appointmentRoomState(
                    item.date,
                    item.time,
                    item.duration_minutes,
                  );
                  if (state === "early" || state === "unscheduled") {
                    showInfoToast(t.appointments.roomNotOpen);
                    return;
                  }
                  if (state === "over") {
                    showInfoToast(t.appointments.roomClosed);
                    return;
                  }
                  router.push({
                    pathname: "/video-call",
                    params: {
                      meetingUrl: item.meeting_link!,
                      ...(item.duration_minutes
                        ? { durationMinutes: String(item.duration_minutes) }
                        : {}),
                      ...(item.other_user_id
                        ? {
                            peerUserId: item.other_user_id,
                            peerName: item.other_name,
                          }
                        : {}),
                    },
                  });
                }}
                style={[styles.openLinkBtn, { borderColor: colors.primary }]}
              >
                <Text style={{ color: colors.primary, fontSize: 12, fontWeight: "700" }}>
                  {isRTL ? "فتح الغرفة" : "Open room"}
                </Text>
              </Pressable>
            </View>
          ) : null}
        </View>

        <Pressable
          onPress={() => handleCancel(item)}
          disabled={isCancelling}
          hitSlop={8}
          style={[styles.cancelBtn, { borderColor: colors.border, opacity: isCancelling ? 0.5 : 1 }]}
        >
          {isCancelling ? (
            <ActivityIndicator size="small" color="#ef4444" />
          ) : (
            <X size={16} color="#ef4444" />
          )}
        </Pressable>
        </View>

        {showPayment ? (
          <VideoAppointmentPaymentPanel
            item={item}
            isDoctor={isDoctor}
            onUpdated={() => void load()}
          />
        ) : null}
      </View>
    );
  };

  return (
    <View style={[styles.root, { backgroundColor: colors.background }]}>
      <AppHeader />

      <FlatList
        data={appointments}
        keyExtractor={(item) => item.id}
        renderItem={renderItem}
        contentContainerStyle={styles.list}
        ListHeaderComponent={
          <View style={[styles.pageHeader, { flexDirection: dir }]}>
            <CalendarClock size={22} color={colors.primary} />
            <Text style={[styles.pageTitle, { color: colors.foreground }]}>
              {isRTL ? "المواعيد القادمة" : "Upcoming appointments"}
            </Text>
          </View>
        }
        ListEmptyComponent={
          loading ? (
            <ActivityIndicator color={colors.primary} style={{ marginTop: 40 }} />
          ) : (
            <View style={styles.empty}>
              <CalendarClock size={48} color={colors.border} />
              <Text style={{ color: colors.mutedForeground, fontSize: 15, marginTop: 12 }}>
                {isRTL ? "لا توجد مواعيد قادمة" : "No upcoming appointments"}
              </Text>
            </View>
          )
        }
        refreshing={loading}
        onRefresh={load}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1 },
  list: { paddingHorizontal: 16, paddingBottom: 32 },
  pageHeader: { alignItems: "center", gap: 8, marginVertical: 16 },
  pageTitle: { fontSize: 18, fontWeight: "800" },
  cardOuter: {
    borderRadius: 14,
    borderWidth: 1,
    padding: 12,
    marginBottom: 10,
    gap: 8,
  },
  card: {
    alignItems: "center",
    gap: 12,
  },
  dateBox: {
    width: 52,
    height: 56,
    borderRadius: 12,
    alignItems: "center",
    justifyContent: "center",
  },
  dateDay: { fontSize: 20, fontWeight: "800" },
  dateMonth: { fontSize: 11, fontWeight: "600" },
  info: { flex: 1, gap: 2 },
  name: { fontSize: 15, fontWeight: "700" },
  statusRow: { alignItems: "center", gap: 4, marginTop: 2 },
  linkWrap: { marginTop: 6, gap: 4, width: "100%" },
  statusDot: { width: 7, height: 7, borderRadius: 4 },
  openLinkBtn: {
    alignSelf: "flex-start",
    borderWidth: 1,
    borderRadius: 8,
    paddingHorizontal: 10,
    paddingVertical: 6,
    marginTop: 2,
  },
  cancelBtn: {
    width: 34,
    height: 34,
    borderRadius: 17,
    borderWidth: 1,
    alignItems: "center",
    justifyContent: "center",
  },
  empty: { alignItems: "center", marginTop: 60 },
});
