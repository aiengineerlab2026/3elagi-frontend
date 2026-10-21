import { router } from "expo-router";
import {
  ChevronRight,
  FileText,
  Stethoscope,
} from "lucide-react-native";
import React from "react";
import { Platform, Pressable, StyleSheet, Text, useWindowDimensions, View } from "react-native";
import { surfaceCard, UI } from "@/constants/uiTokens";
import { useAuthStore } from "@/domains/auth/store";
import { useColors } from "@/hooks/useColors";
import { useI18n } from "@/hooks/useI18n";
import { useWebLayout } from "@/hooks/useWebLayout";
import { alignText, flexRow } from "@/utils/rtl";

type QuickAction = {
  key: string;
  label: string;
  hint: string;
  icon: React.ReactNode;
  onPress: () => void;
  primary?: boolean;
  badge?: string;
};

function greetingKey(): "morning" | "afternoon" | "evening" {
  const h = new Date().getHours();
  if (h < 12) return "morning";
  if (h < 17) return "afternoon";
  return "evening";
}

interface Props {
  aiEnabled?: boolean;
  signedIn?: boolean;
  onFindDoctor?: () => void;
  /** Desktop hero row with TV video — stack actions in the narrow copy column. */
  besideMedia?: boolean;
  /** Native mobile: TV banner inserted between greeting and quick actions. */
  mediaAfterGreeting?: React.ReactNode;
}

export function HomePatientHeader({
  aiEnabled = true,
  signedIn = true,
  onFindDoctor,
  besideMedia = false,
  mediaAfterGreeting,
}: Props) {
  const colors = useColors();
  const { t, isRTL } = useI18n();
  const { isMobile, isDesktop } = useWebLayout();
  const stackActions = Platform.OS !== "web" || isMobile || (besideMedia && isDesktop);
  const dir = flexRow(isRTL);
  const textAlign = alignText(isRTL);
  const { width } = useWindowDimensions();
  const compact = width < 380;
  const profile = useAuthStore((s) => s.profile);
  const firstName = profile?.name?.trim().split(/\s+/)[0] ?? "";
  const period = greetingKey();
  const greeting = firstName
    ? t.home.greetingNamed(period, firstName)
    : t.home.greeting(period);

  // Guests get the public hero instead — never a greeting banner.
  if (!signedIn) return null;

  const actions: QuickAction[] = [
    {
      key: "find",
      label: t.home.findDoctor,
      hint: t.home.findDoctorHint,
      icon: <Stethoscope size={18} color={colors.primaryForeground} />,
      onPress: () => (onFindDoctor ?? (() => router.push("/doctors")))(),
      primary: true,
    },
    {
      key: "records",
      label: t.home.manageMedicalRecords,
      hint: t.home.manageMedicalRecordsHint,
      icon: <FileText size={18} color={colors.primary} />,
      onPress: () => router.push("/(tabs)/records"),
    },
  ];

  return (
    <View style={[styles.wrap, besideMedia && isDesktop && styles.wrapBesideMedia]}>
      <View
        style={[
          styles.banner,
          surfaceCard(colors.card, colors.border),
          { backgroundColor: colors.accent },
        ]}
      >
        <Text style={[styles.greeting, { color: colors.foreground, textAlign }]}>
          {greeting}
        </Text>
        <Text style={[styles.bannerTag, { color: colors.accentForeground, textAlign }]}>
          {t.home.welcomeBanner}
        </Text>
        <Text style={[styles.subtitle, { color: colors.mutedForeground, textAlign }]}>
          {t.home.subtitle}
        </Text>
      </View>

      {mediaAfterGreeting}

      <Text style={[styles.sectionLabel, { color: colors.foreground, textAlign }]}>
        {t.home.quickActions}
      </Text>

      <View
        style={[
          styles.actionsRow,
          stackActions
            ? styles.actionsStack
            : isDesktop
              ? styles.actionsGridDesktop
              : { flexDirection: dir },
        ]}
      >
        {actions.map((action) => (
          <Pressable
            key={action.key}
            onPress={action.onPress}
            accessibilityRole="button"
            accessibilityLabel={`${action.label}. ${action.hint}`}
            style={({ pressed }) => [
              styles.actionCard,
              stackActions ? styles.actionCardStacked : styles.actionCardInline,
              action.primary
                ? { backgroundColor: colors.primary }
                : surfaceCard(colors.card, colors.border),
              {
                opacity: pressed ? 0.92 : 1,
                flexDirection: dir,
              },
            ]}
          >
            <View
              style={[
                styles.actionIcon,
                {
                  backgroundColor: action.primary
                    ? "rgba(255,255,255,0.18)"
                    : `${colors.primary}14`,
                },
              ]}
            >
              {action.icon}
            </View>
            <View style={styles.actionCopy}>
              {action.badge && action.primary ? (
                <Text
                  style={[styles.actionBadge, { color: colors.primaryForeground, textAlign }]}
                  numberOfLines={1}
                >
                  {action.badge}
                </Text>
              ) : null}
              <Text
                style={[
                  styles.actionLabel,
                  {
                    color: action.primary ? colors.primaryForeground : colors.foreground,
                    textAlign,
                  },
                ]}
                numberOfLines={stackActions ? 1 : compact ? 1 : 2}
              >
                {action.label}
              </Text>
              {!action.primary && (stackActions || !compact) ? (
                <Text
                  style={[styles.actionHint, { color: colors.mutedForeground, textAlign }]}
                  numberOfLines={1}
                >
                  {action.hint}
                </Text>
              ) : null}
            </View>
            {!action.primary ? (
              <ChevronRight
                size={16}
                color={colors.mutedForeground}
                style={isRTL ? { transform: [{ scaleX: -1 }] } : undefined}
              />
            ) : null}
          </Pressable>
        ))}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: {
    paddingHorizontal: UI.space.md,
    paddingTop: UI.space.sm,
    paddingBottom: UI.space.xs,
    gap: UI.space.md,
  },
  wrapBesideMedia: {
    paddingHorizontal: 0,
    paddingTop: UI.space.xs,
    justifyContent: "center",
    flex: 1,
  },
  banner: {
    padding: UI.space.md,
    gap: 6,
  },
  greeting: {
    fontSize: 24,
    fontWeight: "700",
    letterSpacing: -0.35,
    lineHeight: 30,
  },
  bannerTag: {
    fontSize: 13,
    fontWeight: "600",
    lineHeight: 18,
  },
  subtitle: {
    fontSize: 14,
    lineHeight: 20,
    maxWidth: 480,
    marginTop: 2,
  },
  sectionLabel: {
    ...UI.type.section,
    fontSize: 15,
  },
  actionsRow: {
    gap: UI.space.sm,
  },
  actionsStack: {
    flexDirection: "column",
  },
  actionsGridDesktop: {
    flexDirection: "row",
    flexWrap: "wrap",
  },
  actionCard: {
    alignItems: "center",
    gap: 10,
    paddingHorizontal: 14,
    paddingVertical: 14,
    borderRadius: UI.radius.card,
  },
  actionCardStacked: {
    width: "100%",
  },
  actionCardInline: {
    flex: 1,
    minWidth: 140,
  },
  actionIcon: {
    width: 38,
    height: 38,
    borderRadius: UI.radius.icon,
    alignItems: "center",
    justifyContent: "center",
    flexShrink: 0,
  },
  actionCopy: {
    flex: 1,
    minWidth: 0,
    gap: 2,
  },
  actionBadge: {
    fontSize: 11,
    fontWeight: "600",
    lineHeight: 14,
    opacity: 0.92,
  },
  actionLabel: {
    fontSize: 14,
    fontWeight: "700",
    lineHeight: 18,
  },
  actionHint: {
    fontSize: 12,
    lineHeight: 16,
  },
});
