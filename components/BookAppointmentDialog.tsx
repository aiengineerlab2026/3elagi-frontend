import React, { useCallback, useEffect, useMemo, useState } from "react";
import {
  ActivityIndicator,
  Modal,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  useWindowDimensions,
  View,
} from "react-native";
import { Calendar, X } from "lucide-react-native";
import { ScheduleMonthGrid } from "@/components/schedule/ScheduleMonthGrid";
import { bookChatAppointment } from "@/domains/appointments/api";
import { fetchDoctorSlots, formatDateYmd, type DoctorSlot } from "@/domains/schedule/api";
import {
  BOOKING_HORIZON_DAYS,
  isDateBeyond,
  isDateInPast,
  parseYmd,
} from "@/domains/schedule/calendar";
import { useWebLayout } from "@/hooks/useWebLayout";
import { useColors } from "@/hooks/useColors";
import { chatFlexRow } from "@/utils/rtl";
import { usePointsStore, selectPointsBalance } from "@/domains/points/store";
import { formatEgp } from "@/utils/credits";

interface Props {
  visible: boolean;
  isRTL: boolean;
  token: string;
  selfId: string;
  doctorUserId: string;
  doctorEntityId: string;
  videoConsultationPrice?: number;
  /**
   * "reschedule" reuses the same slot picker to propose a new time for an
   * existing appointment: no credits are charged and `onSubmitSlot` runs
   * instead of booking.
   */
  mode?: "book" | "reschedule";
  onSubmitSlot?: (date: string, time: string) => Promise<void>;
  onClose: () => void;
  onBooked: () => void;
}

function isFutureSlot(date: string, time: string): boolean {
  return new Date(`${date}T${time}:00`).getTime() > Date.now();
}

export function BookAppointmentDialog({
  visible,
  isRTL,
  token,
  doctorUserId,
  doctorEntityId,
  videoConsultationPrice = 1,
  mode = "book",
  onSubmitSlot,
  onClose,
  onBooked,
}: Props) {
  const colors = useColors();
  const dir = chatFlexRow();
  const today = useMemo(() => new Date(), []);
  const pointsSummary = usePointsStore((s) => s.summary);
  const loadPoints = usePointsStore((s) => s.loadPoints);
  const balance = selectPointsBalance(pointsSummary);
  const price = Math.min(100_000, Math.max(1, videoConsultationPrice));
  // Moving an appointment costs nothing — it was already paid for.
  const hasEnoughCredits = mode === "reschedule" || balance >= price;

  const [viewYear, setViewYear] = useState(today.getFullYear());
  const [viewMonth, setViewMonth] = useState(today.getMonth());
  const [selectedDate, setSelectedDate] = useState(formatDateYmd(today));
  const [slots, setSlots] = useState<DoctorSlot[]>([]);
  const [loadingSlots, setLoadingSlots] = useState(false);
  const [selectedTime, setSelectedTime] = useState<string | null>(null);
  const [booking, setBooking] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!visible) return;
    const now = formatDateYmd(new Date());
    setSelectedDate(now);
    const parsed = parseYmd(now);
    setViewYear(parsed.getFullYear());
    setViewMonth(parsed.getMonth());
    void loadPoints(token);
  }, [visible, token, loadPoints]);

  const loadSlots = useCallback(async () => {
    if (!doctorEntityId || !selectedDate) return;
    if (isDateInPast(selectedDate) || isDateBeyond(selectedDate, BOOKING_HORIZON_DAYS)) {
      setSlots([]);
      return;
    }
    setLoadingSlots(true);
    setError(null);
    try {
      const rows = await fetchDoctorSlots(doctorEntityId, selectedDate);
      setSlots(rows.filter((s) => !s.taken && isFutureSlot(selectedDate, s.time)));
      setSelectedTime(null);
    } catch (e) {
      setSlots([]);
      setError((e as Error).message);
    } finally {
      setLoadingSlots(false);
    }
  }, [doctorEntityId, selectedDate]);

  useEffect(() => {
    if (!visible) return;
    void loadSlots();
  }, [visible, loadSlots]);

  const handleSelectDate = (date: string) => {
    if (isDateInPast(date) || isDateBeyond(date, BOOKING_HORIZON_DAYS)) return;
    setSelectedDate(date);
    const parsed = parseYmd(date);
    setViewYear(parsed.getFullYear());
    setViewMonth(parsed.getMonth());
  };

  const selectedLabel = parseYmd(selectedDate).toLocaleDateString(isRTL ? "ar-EG" : "en-US", {
    weekday: "long",
    month: "long",
    day: "numeric",
    year: "numeric",
  });

  const handleBook = async () => {
    if (!selectedTime || booking || !hasEnoughCredits) return;
    setBooking(true);
    setError(null);
    try {
      if (mode === "reschedule") {
        await onSubmitSlot?.(selectedDate, selectedTime);
      } else {
        await bookChatAppointment(token, doctorUserId, selectedDate, selectedTime);
        await loadPoints(token);
      }
      onBooked();
      onClose();
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setBooking(false);
    }
  };

  const { width: screenWidth } = useWindowDimensions();
  const { isMobile } = useWebLayout();
  const isWeb = Platform.OS === "web";

  const sheetWidth = isWeb
    ? isMobile
      ? screenWidth - 32
      : Math.min(Math.max(320, screenWidth * 0.28), 420)
    : screenWidth - 40;

  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={onClose}>
      <Pressable style={styles.backdrop} onPress={onClose}>
        <Pressable
          style={[
            styles.sheet,
            {
              backgroundColor: colors.card,
              borderColor: colors.border,
              width: sheetWidth,
              maxWidth: "100%",
              alignSelf: "center",
            },
          ]}
          onPress={(e) => e.stopPropagation()}
        >
          <ScrollView
            style={styles.scroll}
            showsVerticalScrollIndicator={false}
            keyboardShouldPersistTaps="handled"
          >
            <View style={[styles.header, { flexDirection: dir }]}>
              <View style={[styles.titleRow, { flexDirection: dir }]}>
                <Calendar size={20} color={colors.primary} />
                <Text style={[styles.title, { color: colors.foreground }]}>
                  {isRTL ? "حجز موعد" : "Book appointment"}
                </Text>
              </View>
              <Pressable onPress={onClose} hitSlop={8}>
                <X size={22} color={colors.mutedForeground} />
              </Pressable>
            </View>

            <Text style={[styles.sectionLabel, { color: colors.mutedForeground, textAlign: isRTL ? "right" : "left" }]}>
              {isRTL ? "اختر اليوم من التقويم" : "Pick a day on the calendar"}
            </Text>

            <View style={styles.calendarWrap}>
              <ScheduleMonthGrid
                isRTL={isRTL}
                year={viewYear}
                month={viewMonth}
                mode="month"
                responsive
                singleDaySelection
                selectedDate={selectedDate}
                selectedWeekStart={selectedDate}
                selectedMonth={viewMonth}
                selectedYear={viewYear}
                onSelectDate={handleSelectDate}
                onPrevMonth={() => {
                  const next = new Date(viewYear, viewMonth - 1, 1);
                  setViewYear(next.getFullYear());
                  setViewMonth(next.getMonth());
                }}
                onNextMonth={() => {
                  const next = new Date(viewYear, viewMonth + 1, 1);
                  setViewYear(next.getFullYear());
                  setViewMonth(next.getMonth());
                }}
              />
            </View>

            <Text style={[styles.selectedDay, { color: colors.foreground, textAlign: isRTL ? "right" : "left" }]}>
              {selectedLabel}
            </Text>

            <Text style={[styles.sectionLabel, { color: colors.mutedForeground, textAlign: isRTL ? "right" : "left" }]}>
              {isRTL ? "الأوقات المتاحة" : "Available times"}
            </Text>

            {loadingSlots ? (
              <ActivityIndicator color={colors.primary} style={{ marginVertical: 20 }} />
            ) : slots.length === 0 ? (
              <Text style={{ color: colors.mutedForeground, textAlign: "center", marginVertical: 16 }}>
                {isRTL
                  ? "لا توجد أوقات متاحة لهذا اليوم — جرّب يومًا آخر"
                  : "No available times for this day — try another date"}
              </Text>
            ) : (
              <View style={[styles.slotGrid, { flexDirection: isRTL ? "row-reverse" : "row" }]}>
                {slots.map((slot) => {
                  const active = selectedTime === slot.time;
                  return (
                    <Pressable
                      key={slot.time}
                      onPress={() => setSelectedTime(slot.time)}
                      style={[
                        styles.slotChip,
                        {
                          borderColor: active ? colors.primary : colors.border,
                          backgroundColor: active ? `${colors.primary}18` : colors.background,
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

            <View
              style={[
                styles.priceRow,
                {
                  backgroundColor: colors.background,
                  borderColor: colors.border,
                },
              ]}
            >
              <Text style={{ color: colors.foreground, fontWeight: "700", textAlign: isRTL ? "right" : "left" }}>
                {isRTL
                  ? `استشارة الفيديو: ${formatEgp(price)}`
                  : `Video consultation: ${formatEgp(price)}`}
              </Text>
              <Text
                style={{
                  color: hasEnoughCredits ? colors.mutedForeground : colors.destructive,
                  fontWeight: "600",
                  marginTop: 4,
                  textAlign: isRTL ? "right" : "left",
                }}
              >
                {isRTL
                  ? `رصيدك: ${formatEgp(balance)}`
                  : `Your balance: ${formatEgp(balance)}`}
              </Text>
              {!hasEnoughCredits ? (
                <Text
                  style={{
                    color: colors.destructive,
                    fontWeight: "600",
                    marginTop: 6,
                    textAlign: isRTL ? "right" : "left",
                  }}
                >
                  {isRTL
                    ? "رصيدك غير كافٍ لحجز استشارة الفيديو"
                    : "Insufficient credits to book this video appointment"}
                </Text>
              ) : null}
            </View>

          </ScrollView>

          {error ? (
            <Text style={{ color: colors.destructive, marginTop: 8, textAlign: "center" }}>{error}</Text>
          ) : null}

          <Pressable
            onPress={() => void handleBook()}
            disabled={!selectedTime || booking || !hasEnoughCredits}
            style={[
              styles.bookBtn,
              {
                backgroundColor: colors.primary,
                opacity: !selectedTime || booking || !hasEnoughCredits ? 0.55 : 1,
              },
            ]}
          >
            {booking ? (
              <ActivityIndicator color="#fff" />
            ) : (
              <Text style={styles.bookBtnText}>
                {mode === "reschedule"
                  ? isRTL
                    ? "اقتراح موعد جديد"
                    : "Propose new time"
                  : isRTL
                    ? "إرسال طلب الحجز"
                    : "Send booking request"}
              </Text>
            )}
          </Pressable>
        </Pressable>
      </Pressable>
    </Modal>
  );
}

const styles = StyleSheet.create({
  backdrop: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.45)",
    justifyContent: "center",
    padding: 16,
  },
  sheet: {
    borderRadius: 16,
    borderWidth: 1,
    padding: 16,
    maxHeight: "90%",
  },
  calendarWrap: {
    width: "100%",
  },
  scroll: { flexShrink: 1 },
  header: {
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: 12,
  },
  titleRow: {
    alignItems: "center",
    gap: 8,
  },
  title: {
    fontSize: 18,
    fontWeight: "800",
  },
  sectionLabel: {
    fontSize: 13,
    fontWeight: "600",
    marginTop: 8,
    marginBottom: 8,
  },
  selectedDay: {
    fontSize: 14,
    fontWeight: "700",
    marginTop: 4,
    marginBottom: 4,
  },
  slotGrid: {
    flexWrap: "wrap",
    gap: 8,
    marginBottom: 12,
  },
  slotChip: {
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderRadius: 10,
    borderWidth: 1,
    minWidth: 72,
    alignItems: "center",
  },
  priceRow: {
    marginTop: 8,
    marginBottom: 4,
    padding: 12,
    borderRadius: 10,
    borderWidth: 1,
  },
  bookBtn: {
    marginTop: 8,
    borderRadius: 12,
    paddingVertical: 14,
    alignItems: "center",
  },
  bookBtnText: {
    color: "#fff",
    fontWeight: "800",
    fontSize: 15,
  },
});
