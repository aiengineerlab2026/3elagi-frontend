import { Bell, BellOff } from "lucide-react-native";
import React, { useCallback, useEffect, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  Platform,
  StyleSheet,
  Switch,
  Text,
  View,
} from "react-native";
import { useAuthStore } from "@/domains/auth/store";
import { unregisterPushToken } from "@/domains/push/api";
import {
  getNotificationsEnabled,
  setNotificationsEnabled,
} from "@/domains/push/notificationsPreference";
import { getPushProvider } from "@/domains/push/push-provider.factory";
import {
  clearPushTokenRegistrationCache,
  getCachedPushToken,
} from "@/domains/push/registerPushToken";
import { useColors } from "@/hooks/useColors";
import { useI18n } from "@/hooks/useI18n";
import { alignText, flexRow } from "@/utils/rtl";

/** Native-only toggle to enable/disable push notifications. */
export function ProfileNotificationsField() {
  const colors = useColors();
  const { t, isRTL } = useI18n();
  const accessToken = useAuthStore((s) => s.accessToken);
  const dir = flexRow(isRTL);
  const textAlign = alignText(isRTL);
  const [enabled, setEnabled] = useState(true);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (Platform.OS === "web") {
      setLoading(false);
      return;
    }
    let cancelled = false;
    void getNotificationsEnabled().then((value) => {
      if (!cancelled) {
        setEnabled(value);
        setLoading(false);
      }
    });
    return () => {
      cancelled = true;
    };
  }, []);

  const onToggle = useCallback(
    async (next: boolean) => {
      if (Platform.OS === "web" || saving) return;
      setSaving(true);
      const previous = enabled;
      setEnabled(next);
      try {
        await setNotificationsEnabled(next);
        const provider = getPushProvider();
        if (next) {
          if (!accessToken) {
            throw new Error("Not signed in");
          }
          const token = await provider.register(accessToken);
          if (!token) {
            await setNotificationsEnabled(false);
            setEnabled(false);
            Alert.alert(
              t.settings.notifications,
              t.settings.notificationsPermissionDenied,
            );
            return;
          }
        } else {
          const token = getCachedPushToken();
          clearPushTokenRegistrationCache();
          if (token && accessToken) {
            await unregisterPushToken(token, accessToken).catch(() => undefined);
          }
        }
      } catch (e) {
        setEnabled(previous);
        await setNotificationsEnabled(previous);
        Alert.alert(
          t.settings.notifications,
          (e as Error).message || t.settings.notificationsUpdateFailed,
        );
      } finally {
        setSaving(false);
      }
    },
    [accessToken, enabled, saving, t.settings],
  );

  if (Platform.OS === "web") return null;

  return (
    <View
      style={[
        styles.row,
        {
          flexDirection: dir,
          backgroundColor: colors.muted,
          borderColor: colors.border,
        },
      ]}
    >
      <View style={[styles.iconWrap, { backgroundColor: `${colors.primary}18` }]}>
        {enabled ? (
          <Bell size={18} color={colors.primary} />
        ) : (
          <BellOff size={18} color={colors.mutedForeground} />
        )}
      </View>
      <View style={styles.copy}>
        <Text style={[styles.title, { color: colors.foreground, textAlign }]}>
          {t.settings.notifications}
        </Text>
        <Text style={[styles.hint, { color: colors.mutedForeground, textAlign }]}>
          {t.settings.notificationsHint}
        </Text>
      </View>
      {loading || saving ? (
        <ActivityIndicator size="small" color={colors.primary} />
      ) : (
        <Switch
          value={enabled}
          onValueChange={(value) => void onToggle(value)}
          trackColor={{ false: colors.border, true: `${colors.primary}88` }}
          thumbColor={enabled ? colors.primary : "#f4f4f5"}
        />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  row: {
    alignItems: "center",
    gap: 12,
    paddingHorizontal: 12,
    paddingVertical: 12,
    borderRadius: 14,
    borderWidth: 1,
  },
  iconWrap: {
    width: 36,
    height: 36,
    borderRadius: 10,
    alignItems: "center",
    justifyContent: "center",
  },
  copy: {
    flex: 1,
    gap: 2,
  },
  title: {
    fontSize: 14,
    fontWeight: "700",
  },
  hint: {
    fontSize: 12,
    lineHeight: 16,
  },
});
