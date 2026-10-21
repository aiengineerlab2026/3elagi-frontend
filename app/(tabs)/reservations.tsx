import { Redirect } from "expo-router";
import React, { useCallback, useEffect, useState } from "react";
import { ActivityIndicator, RefreshControl, ScrollView, Text, View } from "react-native";
import { AppHeader } from "@/components/AppHeader";
import { ApprovalLine, Button, Chip, Field, Muted, Section, StatusBadge, surgeryStyles } from "@/components/surgery/ui";
import { isSignedIn } from "@/domains/auth/session";
import { useAuthStore } from "@/domains/auth/store";
import { fetchSpecialities, type Speciality } from "@/domains/home/api";
import {
  cancelReservation,
  createReservation,
  fetchHospitalDoctors,
  fetchHospitals,
  fetchMyReservations,
  fetchOperations,
  fetchAvailability,
  type Hospital,
  type HospitalDoctor,
  type ReservationStatus,
  type SurgeryReservation,
  type AvailabilityDay,
  type SurgicalOperation,
} from "@/domains/surgery/api";
import { useColors } from "@/hooks/useColors";
import { useI18n } from "@/hooks/useI18n";
import { showErrorToast, showSuccessToast } from "@/utils/toast";

export default function ReservationsScreen() {
  const colors = useColors();
  const { t, isRTL } = useI18n();
  const profile = useAuthStore((s) => s.profile);
  const token = useAuthStore((s) => s.accessToken);
  const [rows, setRows] = useState<SurgeryReservation[]>([]);
  const [loading, setLoading] = useState(true);
  const [booking, setBooking] = useState(false);

  const load = useCallback(async () => {
    if (!token) return;
    setLoading(true);
    try {
      setRows(await fetchMyReservations(token));
    } catch (e) {
      showErrorToast(t.common.error, (e as Error).message);
    } finally {
      setLoading(false);
    }
  }, [token, t]);

  useEffect(() => {
    void load();
  }, [load]);

  if (!isSignedIn(profile, token)) return <Redirect href="/welcome" />;

  const statusLabel = (s: ReservationStatus) =>
    ({
      pending: t.surgery.statusPending,
      approved: t.surgery.statusApproved,
      rejected: t.surgery.statusRejected,
      cancelled: t.surgery.statusCancelled,
    })[s];

  const cancel = async (id: string) => {
    try {
      const saved = await cancelReservation(token!, id);
      setRows((prev) => prev.map((r) => (r.id === id ? { ...r, status: saved.status } : r)));
    } catch (e) {
      showErrorToast(t.common.error, (e as Error).message);
    }
  };

  return (
    <View style={{ flex: 1, backgroundColor: colors.background }}>
      <AppHeader />
      <ScrollView
        contentContainerStyle={surgeryStyles.page}
        keyboardShouldPersistTaps="handled"
        refreshControl={<RefreshControl refreshing={loading} onRefresh={() => void load()} />}
      >
        <View style={surgeryStyles.row}>
          <View style={{ flex: 1, minWidth: 200 }}>
            <Text style={{ fontSize: 22, fontWeight: "800", color: colors.foreground }}>
              {t.surgery.reservations}
            </Text>
            <Muted>{t.surgery.reservationsSubtitle}</Muted>
          </View>
          {!booking ? <Button label={t.surgery.newReservation} onPress={() => setBooking(true)} /> : null}
        </View>

        {booking ? (
          <BookingFlow
            token={token!}
            onClose={() => setBooking(false)}
            onBooked={() => {
              setBooking(false);
              void load();
            }}
          />
        ) : null}

        {!loading && rows.length === 0 ? <Muted>{t.surgery.noReservations}</Muted> : null}
        {rows.map((r) => (
          <Section key={r.id}>
            <View style={surgeryStyles.row}>
              <Text style={{ flex: 1, fontWeight: "800", color: colors.foreground }}>
                {isRTL ? r.operation?.name_ar : r.operation?.name_en}
              </Text>
              <StatusBadge status={r.status} label={statusLabel(r.status)} />
            </View>
            <Muted>
              {r.date} · {r.time.slice(0, 5)}
            </Muted>
            <Muted>
              {t.surgery.hospitalLabel}: {r.hospital?.name ?? "—"}
              {r.hospital?.location ? ` · ${r.hospital.location}` : ""}
            </Muted>
            <Muted>
              {t.surgery.doctor}: {r.doctor?.name ?? "—"}
            </Muted>
            {r.status === "pending" ? <ApprovalLine r={r} /> : null}
            {r.status === "pending" || r.status === "approved" ? (
              <Button
                label={t.surgery.cancelReservation}
                variant="outline"
                style={{ alignSelf: "flex-start" }}
                onPress={() => void cancel(r.id)}
              />
            ) : null}
          </Section>
        ))}
      </ScrollView>
    </View>
  );
}

/** Speciality → operation → hospital → doctor → date → slot. */
function BookingFlow({
  token,
  onClose,
  onBooked,
}: {
  token: string;
  onClose: () => void;
  onBooked: () => void;
}) {
  const colors = useColors();
  const { t, isRTL } = useI18n();
  const [specialities, setSpecialities] = useState<Speciality[]>([]);
  const [specialityId, setSpecialityId] = useState("");
  const [operations, setOperations] = useState<SurgicalOperation[] | null>(null);
  const [operationId, setOperationId] = useState("");
  const [hospitals, setHospitals] = useState<Hospital[] | null>(null);
  const [hospitalId, setHospitalId] = useState("");
  const [doctors, setDoctors] = useState<HospitalDoctor[] | null>(null);
  const [doctorId, setDoctorId] = useState("");
  const [date, setDate] = useState("");
  const [days, setDays] = useState<AvailabilityDay[] | null>(null);
  const [time, setTime] = useState("");
  const [notes, setNotes] = useState("");
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    void fetchSpecialities().then(setSpecialities).catch(() => setSpecialities([]));
  }, []);

  // Each step resets everything after it, then loads its own options.
  useEffect(() => {
    setOperationId("");
    setOperations(null);
    if (specialityId) void fetchOperations(specialityId).then(setOperations).catch(() => setOperations([]));
  }, [specialityId]);

  useEffect(() => {
    setHospitalId("");
    setHospitals(null);
    if (operationId) void fetchHospitals(operationId).then(setHospitals).catch(() => setHospitals([]));
  }, [operationId]);

  useEffect(() => {
    setDoctorId("");
    setDoctors(null);
    setDate("");
    if (hospitalId) {
      void fetchHospitalDoctors(hospitalId, operationId).then(setDoctors).catch(() => setDoctors([]));
    }
  }, [hospitalId, operationId]);

  // Next two weeks of this doctor's slots for the operation at the hospital.
  const loadAvailability = useCallback(() => {
    setTime("");
    setDays(null);
    if (hospitalId && operationId && doctorId) {
      void fetchAvailability(hospitalId, operationId, doctorId, 14).then(setDays).catch(() => setDays([]));
    }
  }, [hospitalId, operationId, doctorId]);

  useEffect(() => {
    setDate("");
    loadAvailability();
  }, [loadAvailability]);

  const freeCount = (d: AvailabilityDay) => d.slots.filter((s) => !s.taken).length;
  const selectedDay = days?.find((d) => d.date === date);

  const submit = async () => {
    setSubmitting(true);
    try {
      await createReservation(token, {
        hospital_id: hospitalId,
        operation_id: operationId,
        doctor_id: doctorId,
        date,
        time,
        notes: notes.trim() || undefined,
      });
      showSuccessToast(t.surgery.reservationSent);
      onBooked();
    } catch (e) {
      showErrorToast(t.common.error, (e as Error).message);
      loadAvailability(); // someone may have taken the slot meanwhile
    } finally {
      setSubmitting(false);
    }
  };

  const loadingOrEmpty = (list: unknown[] | null, empty: string) =>
    list === null ? (
      <ActivityIndicator color={colors.primary} />
    ) : list.length === 0 ? (
      <Muted>{empty}</Muted>
    ) : null;

  const dayLabel = (d: string) => {
    const [y, m, day] = d.split("-").map(Number);
    return `${t.surgery.days[new Date(y, m - 1, day).getDay()]} ${day}/${m}`;
  };

  return (
    <Section title={t.surgery.newReservation} right={<Button label={t.common.cancel} variant="outline" onPress={onClose} />}>
      <Muted>{t.surgery.speciality}</Muted>
      <View style={surgeryStyles.row}>
        {specialities.map((s) => (
          <Chip
            key={s.id}
            label={isRTL ? s.nameAr : s.nameEn}
            active={specialityId === s.id}
            onPress={() => setSpecialityId(s.id)}
          />
        ))}
      </View>

      {specialityId ? (
        <>
          <Muted>{t.surgery.operation}</Muted>
          {loadingOrEmpty(operations, t.surgery.noOperations)}
          <View style={surgeryStyles.row}>
            {operations?.map((o) => (
              <Chip
                key={o.id}
                label={isRTL ? o.name_ar : o.name_en}
                active={operationId === o.id}
                onPress={() => setOperationId(o.id)}
              />
            ))}
          </View>
        </>
      ) : null}

      {operationId ? (
        <>
          <Muted>{t.surgery.hospitalLabel}</Muted>
          {loadingOrEmpty(hospitals, t.surgery.noHospitals)}
          <View style={surgeryStyles.row}>
            {hospitals?.map((h) => (
              <Chip
                key={h.id}
                label={h.location ? `${h.name} · ${h.location}` : h.name}
                active={hospitalId === h.id}
                onPress={() => setHospitalId(h.id)}
              />
            ))}
          </View>
          {hospitals?.find((h) => h.id === hospitalId)?.description ? (
            <Muted>{hospitals.find((h) => h.id === hospitalId)!.description}</Muted>
          ) : null}
        </>
      ) : null}

      {hospitalId ? (
        <>
          <Muted>{t.surgery.doctor}</Muted>
          {loadingOrEmpty(doctors, t.surgery.noDoctors)}
          <View style={surgeryStyles.row}>
            {doctors?.map((d) => (
              <Chip key={d.id} label={d.name} active={doctorId === d.id} onPress={() => setDoctorId(d.id)} />
            ))}
          </View>
        </>
      ) : null}

      {doctorId ? (
        <>
          <Muted>{t.surgery.date}</Muted>
          {days === null ? <ActivityIndicator color={colors.primary} /> : null}
          {days && !days.some((d) => freeCount(d) > 0) ? <Muted>{t.surgery.noAvailability}</Muted> : null}
          <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: 8 }}>
            {days
              ?.filter((d) => d.slots.length > 0)
              .map((d) => (
                <Chip
                  key={d.date}
                  label={`${dayLabel(d.date)} · ${freeCount(d)} ${t.surgery.freeSlots}`}
                  active={date === d.date}
                  disabled={freeCount(d) === 0}
                  onPress={() => {
                    setDate(d.date);
                    setTime("");
                  }}
                />
              ))}
          </ScrollView>
        </>
      ) : null}

      {selectedDay ? (
        <>
          <Muted>{t.surgery.slot}</Muted>
          <View style={surgeryStyles.row}>
            {selectedDay.slots.map((s) => (
              <Chip
                key={s.time}
                label={s.taken ? `${s.time} · ${t.surgery.reserved}` : s.time}
                active={time === s.time}
                disabled={s.taken}
                onPress={() => setTime(s.time)}
              />
            ))}
          </View>
        </>
      ) : null}

      {time ? (
        <>
          <Field label={t.surgery.notes} multiline value={notes} onChangeText={setNotes} />
          <Button label={t.surgery.reserve} busy={submitting} onPress={() => void submit()} />
        </>
      ) : null}
    </Section>
  );
}
