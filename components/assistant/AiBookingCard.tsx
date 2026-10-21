import React, { useCallback, useEffect, useMemo, useState } from "react";
import {
  ActivityIndicator,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from "react-native";
import { Calendar, Check } from "lucide-react-native";
import { bookChatAppointment } from "@/domains/appointments/api";
import {
  addDays,
  fetchDoctorSlots,
  formatDateYmd,
  type DoctorSlot,
} from "@/domains/schedule/api";
import { parseYmd } from "@/domains/schedule/calendar";
import { useAuthStore } from "@/domains/auth/store";
import {
  usePointsStore,
  selectPointsBalance,
} from "@/domains/points/store";
import { useColors } from "@/hooks/useColors";
import { useI18n } from "@/hooks/useI18n";
import { formatEgp } from "@/utils/credits";
import type { BookingDirective } from "@/utils/assistantBooking";

interface Props {
  directive: BookingDirective;
}

const DATE_STRIP_DAYS = 14;

function isFutureSlot(date: string, time: string): boolean {
  return new Date(`${date}T${time}:00`).getTime() > Date.now();
}

export function AiBookingCard({ directive }: Props) {
  const colors = useColors();
  const { isRTL } = useI18n();
  const token = useAuthStore((s) => s.accessToken);
  const summary = usePointsStore((s) => s.summary);
  const loadPoints = usePointsStore((s) => s.loadPoints);
  const balance = selectPointsBalance(summary);
  const price = Math.min(100_000, Math.max(1, directive.price ?? 1));
  const hasEnoughCredits = balance >= price;

  const dates = useMemo(() => {
    const today = new Date();
    return Array.from({ length: DATE_STRIP_DAYS }, (_, i) =>
      formatDateYmd(addDays(today, i)),
    );
  }, []);

  const [selectedDate, setSelectedDate] = useState<string | null>(
    directive.date ?? null,
  );
  const [slots, setSlots] = useState<DoctorSlot[]>([]);
  const [loadingSlots, setLoadingSlots] = useState(false);
  const [confirmTime, setConfirmTime] = useState<string | null>(null);
  const [booking, setBooking] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [booked, setBooked] = useState<{ date: string; time: string } | null>(null);

  useEffect(() => {
    if (token) void loadPoints(token);
  }, [token, loadPoints]);

  const loadSlots = useCallback(async () => {
    if (!selectedDate) return;
    setLoadingSlots(true);
    setError(null);
    setConfirmTime(null);
    try {
      const rows = await fetchDoctorSlots(directive.doctorEntityId, selectedDate);
      setSlots(rows.filter((s) => !s.taken && isFutureSlot(selectedDate, s.time)));
    } catch (e) {
      setSlots([]);
      setError((e as Error).message);
    } finally {
      setLoadingSlots(false);
    }
  }, [directive.doctorEntityId, selectedDate]);

  useEffect(() => {
    void loadSlots();
  }, [loadSlots]);

  const handleConfirm = async () => {
    if (!confirmTime || !selectedDate || !token || booking) return;
    setBooking(true);
    setError(null);
    try {
      await bookChatAppointment(token, directive.doctorUserId, selectedDate, confirmTime, {
        reason: directive.reason,
        patientInsight: directive.patientInsight,
      });
      await loadPoints(token);
      setBooked({ date: selectedDate, time: confirmTime });
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setBooking(false);
    }
  };

  const dayLabel = (ymd: string) =>
    parseYmd(ymd).toLocaleDateString(isRTL ? "ar-EG" : "en-US", {
      weekday: "short",
    });
  const dayNum = (ymd: string) => parseYmd(ymd).getDate();

  if (booked) {
    return (
      <View style={[styles.card, { backgroundColor: colors.background, borderColor: colors.primary }]}>
        <View style={styles.confirmedRow}>
          <Check size={18} color={colors.primary} />
          <Text style={[styles.confirmedText, { color: colors.foreground }]}>
            {isRTL
              ? `تم إرسال طلب الحجز مع ${directive.doctorName ?? "الطبيب"} يوم ${booked.date} الساعة ${booked.time}`
              : `Booking request sent to ${directive.doctorName ?? "the doctor"} on ${booked.date} at ${booked.time}`}
          </Text>
        </View>
      </View>
    );
  }

  return (
    <View style={[styles.card, { backgroundColor: colors.background, borderColor: colors.border }]}>
      <View style={styles.titleRow}>
        <Calendar size={16} color={colors.primary} />
        <Text style={[styles.title, { color: colors.foreground }]}>
          {directive.doctorName
            ? isRTL
              ? `حجز موعد مع ${directive.doctorName}`
              : `Book with ${directive.doctorName}`
            : isRTL
              ? "حجز موعد"
              : "Book appointment"}
        </Text>
      </View>

      <Text style={[styles.sectionLabel, { color: colors.mutedForeground, textAlign: isRTL ? "right" : "left" }]}>
        {isRTL ? "اختر اليوم" : "Choose a day"}
      </Text>
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={styles.dateStrip}
      >
        {dates.map((d) => {
          const active = selectedDate === d;
          return (
            <Pressable
              key={d}
              onPress={() => setSelectedDate(d)}
              style={[
                styles.dateChip,
                {
                  borderColor: active ? colors.primary : colors.border,
                  backgroundColor: active ? `${colors.primary}18` : colors.card,
                },
              ]}
            >
              <Text style={{ color: active ? colors.primary : colors.mutedForeground, fontSize: 11 }}>
                {dayLabel(d)}
              </Text>
              <Text style={{ color: active ? colors.primary : colors.foreground, fontWeight: "700", fontSize: 15 }}>
                {dayNum(d)}
              </Text>
            </Pressable>
          );
        })}
      </ScrollView>

      {selectedDate ? (
        <>
          <Text style={[styles.sectionLabel, { color: colors.mutedForeground, textAlign: isRTL ? "right" : "left" }]}>
            {isRTL ? "الأوقات المتاحة" : "Available times"}
          </Text>
          {loadingSlots ? (
            <ActivityIndicator color={colors.primary} style={{ marginVertical: 12 }} />
          ) : slots.length === 0 ? (
            <Text style={{ color: colors.mutedForeground, marginVertical: 8, textAlign: "center" }}>
              {isRTL ? "لا توجد أوقات متاحة — جرّب يومًا آخر" : "No times available — try another day"}
            </Text>
          ) : (
            <View style={styles.slotGrid}>
              {slots.map((slot) => {
                const active = confirmTime === slot.time;
                return (
                  <Pressable
                    key={slot.time}
                    onPress={() => setConfirmTime(active ? null : slot.time)}
                    style={[
                      styles.slotChip,
                      {
                        borderColor: active ? colors.primary : colors.border,
                        backgroundColor: active ? `${colors.primary}18` : colors.card,
                      },
                    ]}
                  >
                    <Text style={{ color: active ? colors.primary : colors.foreground, fontWeight: "600" }}>
                      {slot.time}
                    </Text>
                  </Pressable>
                );
              })}
            </View>
          )}
        </>
      ) : null}

      {confirmTime ? (
        <View style={[styles.confirmBar, { borderColor: colors.border }]}>
          <Text style={{ color: colors.foreground, fontWeight: "600", marginBottom: 6, textAlign: isRTL ? "right" : "left" }}>
            {isRTL
              ? `حجز الساعة ${confirmTime} مقابل ${formatEgp(price)}`
              : `Reserve ${confirmTime} for ${formatEgp(price)}`}
          </Text>
          {!hasEnoughCredits ? (
            <Text style={{ color: colors.destructive, fontWeight: "600", marginBottom: 6, textAlign: isRTL ? "right" : "left" }}>
              {isRTL
                ? `رصيدك غير كافٍ (${formatEgp(balance)})`
                : `Insufficient credits (${formatEgp(balance)})`}
            </Text>
          ) : null}
          <Pressable
            onPress={() => void handleConfirm()}
            disabled={booking || !hasEnoughCredits}
            style={[
              styles.confirmBtn,
              { backgroundColor: colors.primary, opacity: booking || !hasEnoughCredits ? 0.55 : 1 },
            ]}
          >
            {booking ? (
              <ActivityIndicator color="#fff" />
            ) : (
              <Text style={styles.confirmBtnText}>
                {isRTL ? "تأكيد الحجز" : "Confirm booking"}
              </Text>
            )}
          </Pressable>
        </View>
      ) : null}

      {error ? (
        <Text style={{ color: colors.destructive, marginTop: 8, textAlign: "center" }}>{error}</Text>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    marginTop: 10,
    borderRadius: 14,
    borderWidth: 1,
    padding: 12,
  },
  titleRow: { flexDirection: "row", alignItems: "center", gap: 6, marginBottom: 8 },
  title: { fontSize: 14, fontWeight: "700" },
  sectionLabel: { fontSize: 12, fontWeight: "600", marginTop: 6, marginBottom: 6 },
  dateStrip: { gap: 8, paddingVertical: 2 },
  dateChip: {
    width: 48,
    paddingVertical: 8,
    borderRadius: 10,
    borderWidth: 1,
    alignItems: "center",
    gap: 2,
  },
  slotGrid: { flexDirection: "row", flexWrap: "wrap", gap: 8 },
  slotChip: {
    paddingHorizontal: 14,
    paddingVertical: 9,
    borderRadius: 10,
    borderWidth: 1,
    minWidth: 66,
    alignItems: "center",
  },
  confirmBar: { marginTop: 10, borderTopWidth: 1, paddingTop: 10 },
  confirmBtn: { borderRadius: 10, paddingVertical: 12, alignItems: "center" },
  confirmBtnText: { color: "#fff", fontWeight: "800", fontSize: 14 },
  confirmedRow: { flexDirection: "row", alignItems: "center", gap: 8 },
  confirmedText: { flex: 1, fontSize: 13, fontWeight: "600", lineHeight: 19 },
});
