import { BadgeCheck, Camera, ShieldAlert, UserRound } from "lucide-react-native";
import React from "react";
import { Image, Pressable, StyleSheet, Text, View } from "react-native";
import { PROFILE_SETTINGS } from "@/constants/profileSettingsDesign";
import type { Speciality } from "@/domains/home/api";
import { useColors } from "@/hooks/useColors";

type Props = {
  name: string;
  email?: string;
  displayPhoto?: string | null;
  onPickPhoto: () => void;
  specialityIds: string[];
  specialities: Speciality[];
  locale: string;
  isRTL: boolean;
  isVerified: boolean;
};

function resolveSpecialityLabel(
  specialityIds: string[],
  specialities: Speciality[],
  locale: string,
  isRTL: boolean,
): string {
  const primary = specialities.find((s) => s.id === specialityIds[0]);
  if (!primary) return isRTL ? "طبيب" : "Doctor";
  return locale === "ar" ? primary.nameAr : primary.nameEn;
}

export function DoctorProfileHeader({
  name,
  email,
  displayPhoto,
  onPickPhoto,
  specialityIds,
  specialities,
  locale,
  isRTL,
  isVerified,
}: Props) {
  const colors = useColors();
  const dir = isRTL ? "row-reverse" : "row";
  const textAlign = isRTL ? "right" : "left";
  const displayName = name.trim()
    ? name.trim().startsWith("Dr")
      ? name.trim()
      : `Dr. ${name.trim()}`
    : isRTL
      ? "طبيب"
      : "Doctor";
  const roleLabel = resolveSpecialityLabel(specialityIds, specialities, locale, isRTL);

  return (
    <View
      style={[
        styles.card,
        {
          backgroundColor: PROFILE_SETTINGS.bg.card,
          borderColor: PROFILE_SETTINGS.border,
        },
      ]}
    >
      <View style={[styles.row, { flexDirection: dir }]}>
        <Pressable
          onPress={onPickPhoto}
          style={styles.avatarWrap}
          accessibilityRole="button"
          accessibilityLabel={isRTL ? "تغيير الصورة" : "Change profile photo"}
        >
          {displayPhoto ? (
            <Image
              source={{ uri: displayPhoto }}
              style={[styles.avatar, { backgroundColor: colors.muted, borderColor: PROFILE_SETTINGS.border }]}
            />
          ) : (
            <View
              style={[
                styles.avatar,
                {
                  backgroundColor: colors.muted,
                  borderColor: PROFILE_SETTINGS.border,
                  alignItems: "center",
                  justifyContent: "center",
                },
              ]}
            >
              <UserRound size={40} color={colors.mutedForeground} />
            </View>
          )}
          <View style={[styles.editBadge, { backgroundColor: PROFILE_SETTINGS.brand }]}>
            <Camera size={14} color="#fff" />
          </View>
        </Pressable>

        <View style={[styles.meta, { alignItems: isRTL ? "flex-end" : "flex-start" }]}>
          <Text style={[styles.name, { color: PROFILE_SETTINGS.text.primary, textAlign }]} numberOfLines={2}>
            {displayName}
          </Text>
          {email ? (
            <Text
              style={[styles.email, { color: PROFILE_SETTINGS.text.secondary, textAlign }]}
              numberOfLines={1}
            >
              {email}
            </Text>
          ) : null}
          <View style={[styles.badges, { flexDirection: dir }]}>
            <View style={[styles.roleBadge, { backgroundColor: `${PROFILE_SETTINGS.brand}14` }]}>
              <Text style={[styles.roleText, { color: PROFILE_SETTINGS.brand }]}>{roleLabel}</Text>
            </View>
            <View
              style={[
                styles.verifyBadge,
                {
                  backgroundColor: isVerified
                    ? PROFILE_SETTINGS.verified.bg
                    : PROFILE_SETTINGS.pending.bg,
                  borderColor: isVerified
                    ? PROFILE_SETTINGS.verified.border
                    : PROFILE_SETTINGS.pending.border,
                },
              ]}
            >
              {isVerified ? (
                <BadgeCheck size={14} color={PROFILE_SETTINGS.verified.text} />
              ) : (
                <ShieldAlert size={14} color={PROFILE_SETTINGS.pending.text} />
              )}
              <Text
                style={{
                  color: isVerified ? PROFILE_SETTINGS.verified.text : PROFILE_SETTINGS.pending.text,
                  fontWeight: "700",
                  fontSize: 12,
                }}
              >
                {isVerified
                  ? isRTL
                    ? "مزود موثّق"
                    : "Verified Provider"
                  : isRTL
                    ? "تحقق قيد الإكمال"
                    : "Verification pending"}
              </Text>
            </View>
          </View>
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    borderWidth: 1,
    borderRadius: PROFILE_SETTINGS.radius.card,
    padding: PROFILE_SETTINGS.cardPadding,
  },
  row: {
    alignItems: "center",
    gap: 20,
  },
  avatarWrap: {
    position: "relative",
  },
  avatar: {
    width: 88,
    height: 88,
    borderRadius: 44,
    borderWidth: 2,
  },
  editBadge: {
    position: "absolute",
    right: 0,
    bottom: 0,
    width: 28,
    height: 28,
    borderRadius: 14,
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 2,
    borderColor: "#fff",
  },
  meta: {
    flex: 1,
    minWidth: 0,
    gap: 4,
  },
  name: {
    fontSize: 22,
    fontWeight: "800",
    lineHeight: 28,
  },
  email: {
    fontSize: 14,
    lineHeight: 20,
  },
  badges: {
    flexWrap: "wrap",
    gap: 8,
    marginTop: 8,
    alignItems: "center",
  },
  roleBadge: {
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 999,
  },
  roleText: {
    fontSize: 12,
    fontWeight: "700",
  },
  verifyBadge: {
    flexDirection: "row",
    alignItems: "center",
    gap: 5,
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 999,
    borderWidth: 1,
  },
});
