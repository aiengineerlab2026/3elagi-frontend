import React, { useEffect, useState } from "react";
import { ActivityIndicator, Pressable, Text, TextInput, View } from "react-native";
import { HospitalShell } from "@/components/hospital/HospitalShell";
import { Button, Muted, Section, StatusBadge, surgeryStyles, useStatusLabel } from "@/components/surgery/ui";
import {
  inviteDoctor,
  removeDoctor,
  searchDoctors,
  type HospitalDoctor,
  type HospitalLink,
} from "@/domains/surgery/api";
import { useMyHospital } from "@/domains/surgery/useMyHospital";
import { useColors } from "@/hooks/useColors";
import { useI18n } from "@/hooks/useI18n";
import { showErrorToast, showSuccessToast } from "@/utils/toast";

/** Link doctors to the hospital: autocomplete → invite → doctor accepts. */
export default function HospitalDoctors() {
  const colors = useColors();
  const { t, isRTL } = useI18n();
  const statusLabel = useStatusLabel();
  const { token, hospital, reload } = useMyHospital();
  const links = hospital?.links ?? [];

  const run = async (action: () => Promise<unknown>, success?: string) => {
    try {
      await action();
      await reload();
      if (success) showSuccessToast(success);
    } catch (e) {
      showErrorToast(t.common.error, (e as Error).message);
    }
  };

  const specialityName = (d?: HospitalDoctor) =>
    d?.speciality ? (isRTL ? d.speciality.name_ar : d.speciality.name_en) : "";

  return (
    <HospitalShell title={t.surgery.doctors} subtitle={t.surgery.doctorsSubtitle} hospital={hospital}>
      <Section title={t.surgery.invite}>
        <DoctorAutocomplete
          token={token}
          links={links}
          onPick={(d) => void run(() => inviteDoctor(token, d.id), `${t.surgery.invite}: ${d.name}`)}
        />
      </Section>

      <Section title={`${t.surgery.doctors} (${links.length})`}>
        {!hospital ? <ActivityIndicator /> : null}
        {hospital && links.length === 0 ? <Muted>{t.surgery.noLinkedDoctors}</Muted> : null}
        {links.map((l) => (
          <View key={l.doctor_id} style={surgeryStyles.row}>
            <View style={{ flex: 1, minWidth: 160 }}>
              <Text style={{ fontWeight: "700", color: colors.foreground }}>{l.doctor?.name}</Text>
              {specialityName(l.doctor) ? <Muted>{specialityName(l.doctor)}</Muted> : null}
            </View>
            <StatusBadge status={l.status} label={statusLabel(l.status)} />
            {l.status === "rejected" ? (
              <Button label={t.surgery.invite} onPress={() => void run(() => inviteDoctor(token, l.doctor_id))} />
            ) : null}
            <Button label="✕" variant="outline" onPress={() => void run(() => removeDoctor(token, l.doctor_id))} />
          </View>
        ))}
      </Section>
    </HospitalShell>
  );
}

function DoctorAutocomplete({
  token,
  links,
  onPick,
}: {
  token: string;
  links: HospitalLink[];
  onPick: (d: HospitalDoctor) => void;
}) {
  const colors = useColors();
  const { t, isRTL } = useI18n();
  const statusLabel = useStatusLabel();
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<HospitalDoctor[] | null>(null);
  const [focused, setFocused] = useState(false);

  useEffect(() => {
    const term = query.trim();
    if (!term) {
      setResults(null);
      return;
    }
    let live = true;
    const timer = setTimeout(() => {
      void searchDoctors(token, term)
        .then((r) => live && setResults(r))
        .catch(() => live && setResults([]));
    }, 250);
    return () => {
      live = false;
      clearTimeout(timer);
    };
  }, [query, token]);

  const linkOf = (id: string) => links.find((l) => l.doctor_id === id);
  const open = focused || !!query.trim();

  return (
    <View>
      <TextInput
        value={query}
        onChangeText={setQuery}
        onFocus={() => setFocused(true)}
        onBlur={() => setTimeout(() => setFocused(false), 150)}
        placeholder={t.surgery.typeDoctorName}
        placeholderTextColor={colors.mutedForeground}
        autoCapitalize="none"
        autoCorrect={false}
        keyboardType="email-address"
        accessibilityRole="search"
        style={{
          borderWidth: 1,
          borderColor: colors.border,
          borderRadius: 10,
          paddingHorizontal: 12,
          paddingVertical: 10,
          fontSize: 15,
          color: colors.foreground,
          backgroundColor: colors.background,
          textAlign: isRTL ? "right" : "left",
        }}
      />
      {open && query.trim() ? (
        <View
          accessibilityRole="list"
          style={{
            marginTop: 4,
            borderWidth: 1,
            borderColor: colors.border,
            borderRadius: 10,
            backgroundColor: colors.card,
            overflow: "hidden",
          }}
        >
          {results === null ? (
            <ActivityIndicator style={{ padding: 12 }} color={colors.primary} />
          ) : results.length === 0 ? (
            <Text style={{ padding: 12, color: colors.mutedForeground }}>{t.surgery.noMatches}</Text>
          ) : (
            results.map((d, i) => {
              const link = linkOf(d.id);
              const blocked = !!link && link.status !== "rejected";
              return (
                <Pressable
                  key={d.id}
                  disabled={blocked}
                  accessibilityRole="button"
                  onPress={() => {
                    onPick(d);
                    setQuery("");
                    setResults(null);
                  }}
                  style={({ pressed, hovered }: { pressed: boolean; hovered?: boolean }) => ({
                    flexDirection: isRTL ? "row-reverse" : "row",
                    alignItems: "center",
                    gap: 8,
                    paddingHorizontal: 12,
                    paddingVertical: 10,
                    borderTopWidth: i ? 1 : 0,
                    borderTopColor: colors.border,
                    backgroundColor: pressed || hovered ? colors.muted : "transparent",
                    opacity: blocked ? 0.55 : 1,
                  })}
                >
                  <View style={{ flex: 1 }}>
                    <Text style={{ color: colors.foreground, fontWeight: "700" }}>{d.name}</Text>
                    {d.speciality || d.email ? (
                      <Text style={{ color: colors.mutedForeground, fontSize: 13 }}>
                        {[d.speciality ? (isRTL ? d.speciality.name_ar : d.speciality.name_en) : "", d.email ?? ""]
                          .filter(Boolean)
                          .join(" · ")}
                      </Text>
                    ) : null}
                  </View>
                  {link ? (
                    <Text style={{ color: colors.mutedForeground, fontSize: 12 }}>
                      {blocked ? `${t.surgery.alreadyLinked} · ${statusLabel(link.status)}` : statusLabel(link.status)}
                    </Text>
                  ) : (
                    <Text style={{ color: colors.primary, fontWeight: "700" }}>{t.surgery.invite}</Text>
                  )}
                </Pressable>
              );
            })
          )}
        </View>
      ) : null}
    </View>
  );
}
