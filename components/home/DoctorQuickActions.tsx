import { router } from "expo-router";
import {
  CalendarClock,
  ChevronRight,
  ClipboardList,
  Radio,
} from "lucide-react-native";
import React from "react";
import {
  Pressable,
  StyleSheet,
  Switch,
  Text,
  useWindowDimensions,
  View,
} from "react-native";
import { DASHBOARD_INDIGO } from "@/constants/dashboardTheme";
import { surfaceCard, UI } from "@/constants/uiTokens";
import { IMMEDIATE_VIDEO_CALL_ENABLED } from "@/constants/features";
import { useColors } from "@/hooks/useColors";
import { useI18n } from "@/hooks/useI18n";
import { alignText, flexRow } from "@/utils/rtl";

type QuickAction = {
  key: string;
  label: string;
  hint: string;
  icon: React.ReactNode;
  onPress?: () => void;
  toggle?: boolean;
};

interface Props {
  immediateCallEnabled: boolean;
  togglingAvailability?: boolean;
  onToggleAvailability: (next: boolean) => void;
  /** Tighter rows for the merged desktop panel. */
  compact?: boolean;
  /** No outer card chrome — sits inside the unified hero panel. */
  flush?: boolean;
}

export function DoctorQuickActions({
  immediateCallEnabled,
  togglingAvailability = false,
  onToggleAvailability,
  compact = false,
  flush = false,
}: Props) {
  const colors = useColors();
  const { t, isRTL } = useI18n();
  const dir = flexRow(isRTL);
  const textAlign = alignText(isRTL);
  const { width } = useWindowDimensions();
  const narrow = width < 380;

  const actions: QuickAction[] = [
    {
      key: "schedule",
      label: t.doctorDashboard.viewSchedule,
      hint: t.doctorDashboard.viewScheduleHint,
      icon: <CalendarClock size={compact ? 16 : 18} color={DASHBOARD_INDIGO} />,
      onPress: () => router.push("/(tabs)/appointments"),
    },
    {
      key: "records",
      label: t.doctorDashboard.patientRecords,
      hint: t.doctorDashboard.patientRecordsHint,
      icon: <ClipboardList size={compact ? 16 : 18} color={DASHBOARD_INDIGO} />,
      onPress: () => router.push("/(tabs)/patients"),
    },
    ...(IMMEDIATE_VIDEO_CALL_ENABLED
      ? [
          {
            key: "availability",
            label: t.doctorDashboard.availability,
            hint: immediateCallEnabled
              ? t.doctorDashboard.availabilityOn
              : t.doctorDashboard.availabilityOff,
            icon: (
              <Radio
                size={compact ? 16 : 18}
                color={immediateCallEnabled ? colors.success : colors.mutedForeground}
              />
            ),
            toggle: true,
          } satisfies QuickAction,
        ]
      : []),
  ];

  return (
    <View style={styles.list}>
      {actions.map((action) => {
        const cardStyle = [
          styles.actionCard,
          compact && styles.actionCardCompact,
          flush && styles.actionCardFlush,
          !flush && surfaceCard(colors.card, colors.border),
          flush && { backgroundColor: colors.card, borderWidth: 1, borderColor: `${DASHBOARD_INDIGO}18` },
          { flexDirection: dir },
        ];

        const inner = (
          <>
            <View
              style={[
                styles.actionIcon,
                compact && styles.actionIconCompact,
                { backgroundColor: `${DASHBOARD_INDIGO}12` },
              ]}
            >
              {action.icon}
            </View>
            <View style={styles.actionCopy}>
              <Text
                style={[
                  styles.actionLabel,
                  compact && styles.actionLabelCompact,
                  { color: colors.foreground, textAlign },
                ]}
                numberOfLines={1}
              >
                {action.label}
              </Text>
              {!compact || !narrow ? (
                <Text
                  style={[styles.actionHint, { color: colors.mutedForeground, textAlign }]}
                  numberOfLines={1}
                >
                  {action.hint}
                </Text>
              ) : null}
            </View>
            {action.toggle ? (
              <Switch
                value={immediateCallEnabled}
                onValueChange={onToggleAvailability}
                disabled={togglingAvailability}
                trackColor={{ false: colors.border, true: `${DASHBOARD_INDIGO}66` }}
                thumbColor={immediateCallEnabled ? DASHBOARD_INDIGO : colors.card}
              />
            ) : (
              <ChevronRight
                size={15}
                color={colors.mutedForeground}
                style={isRTL ? { transform: [{ scaleX: -1 }] } : undefined}
              />
            )}
          </>
        );

        if (action.toggle) {
          return (
            <View key={action.key} style={cardStyle}>
              {inner}
            </View>
          );
        }

        return (
          <Pressable
            key={action.key}
            onPress={action.onPress}
            accessibilityRole="button"
            accessibilityLabel={`${action.label}. ${action.hint}`}
            style={({ pressed }) => [...cardStyle, { opacity: pressed ? 0.92 : 1 }]}
          >
            {inner}
          </Pressable>
        );
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  list: {
    gap: 5,
  },
  actionCard: {
    alignItems: "center",
    gap: 10,
    paddingHorizontal: 12,
    paddingVertical: 11,
    borderRadius: UI.radius.inner,
  },
  actionCardCompact: {
    paddingHorizontal: 10,
    paddingVertical: 8,
    gap: 8,
  },
  actionCardFlush: {
    borderRadius: UI.radius.inner,
    shadowOpacity: 0,
    elevation: 0,
  },
  actionIcon: {
    width: 36,
    height: 36,
    borderRadius: UI.radius.icon,
    alignItems: "center",
    justifyContent: "center",
    flexShrink: 0,
  },
  actionIconCompact: {
    width: 32,
    height: 32,
  },
  actionCopy: {
    flex: 1,
    minWidth: 0,
    gap: 1,
  },
  actionLabel: {
    fontSize: 14,
    fontWeight: "600",
    lineHeight: 18,
  },
  actionLabelCompact: {
    fontSize: 13,
    lineHeight: 17,
  },
  actionHint: {
    fontSize: 11,
    lineHeight: 15,
  },
});
