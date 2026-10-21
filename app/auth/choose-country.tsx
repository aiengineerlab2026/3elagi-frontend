import { Redirect, router } from "expo-router";
import React, { useState } from "react";
import {
  ActivityIndicator,
  Platform,
  Pressable,
  StyleSheet,
  Text,
  View,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { AuthLoginBackground } from "@/components/auth/AuthLoginBackground";
import { CountryFlagToggle } from "@/components/country/CountryFlagToggle";
import {
  DEFAULT_PATIENT_COUNTRY,
  normalizeMarketCountry,
  type MarketCountryCode,
} from "@/constants/patientCountries";
import { updateAccountProfile } from "@/domains/auth/profile-api";
import { isSignedIn } from "@/domains/auth/session";
import { useAuthStore } from "@/domains/auth/store";
import { getPostAuthRoute } from "@/domains/auth/navigation";
import { useColors } from "@/hooks/useColors";
import { useI18n } from "@/hooks/useI18n";
import { useWebLayout } from "@/hooks/useWebLayout";
import { showErrorToast } from "@/utils/toast";

export default function ChooseCountryScreen() {
  const colors = useColors();
  const insets = useSafeAreaInsets();
  const { t, isRTL } = useI18n();
  const { isDesktop } = useWebLayout();
  const profile = useAuthStore((s) => s.profile);
  const accessToken = useAuthStore((s) => s.accessToken);
  const role = useAuthStore((s) => s.role);
  const doctorApprovalStatus = useAuthStore((s) => s.doctorApprovalStatus);
  const setProfile = useAuthStore((s) => s.setProfile);
  const [country, setCountry] = useState<MarketCountryCode>(() =>
    normalizeMarketCountry(profile?.country) || DEFAULT_PATIENT_COUNTRY,
  );
  const [saving, setSaving] = useState(false);

  if (!isSignedIn(profile, accessToken) || !role) {
    return <Redirect href="/welcome" />;
  }

  if (role.toLowerCase() !== "patient") {
    return <Redirect href={getPostAuthRoute(role, doctorApprovalStatus)} />;
  }

  const continueToApp = async () => {
    if (!accessToken || !profile) return;
    setSaving(true);
    try {
      if (normalizeMarketCountry(profile.country) !== country) {
        try {
          const updated = await updateAccountProfile(accessToken, role, {
            name: profile.name,
            phone: profile.phone ?? "",
            country,
          });
          setProfile({ ...profile, ...updated, country });
        } catch {
          setProfile({ ...profile, country });
        }
      } else {
        setProfile({ ...profile, country });
      }
      router.replace(getPostAuthRoute(role, doctorApprovalStatus));
    } catch (e) {
      showErrorToast(
        t.auth.loginFailed,
        e instanceof Error ? e.message : t.auth.genericError,
      );
    } finally {
      setSaving(false);
    }
  };

  const screen = (
    <View
      style={[
        styles.screen,
        {
          backgroundColor: Platform.OS === "web" ? "transparent" : colors.background,
          paddingTop: Platform.OS === "web" && isDesktop ? 0 : insets.top + 8,
          paddingBottom: insets.bottom + 24,
        },
      ]}
    >
      <View style={styles.body}>
        <Text
          style={[
            styles.title,
            { color: colors.foreground, textAlign: isRTL ? "right" : "left" },
          ]}
        >
          {t.auth.chooseCountryTitle}
        </Text>
        <Text
          style={[
            styles.sub,
            { color: colors.mutedForeground, textAlign: isRTL ? "right" : "left" },
          ]}
        >
          {t.auth.chooseCountrySubtitle}
        </Text>

        <CountryFlagToggle
          value={country}
          onChange={setCountry}
          persist={false}
          disabled={saving}
        />

        <Pressable
          onPress={() => void continueToApp()}
          disabled={saving}
          style={[
            styles.btn,
            {
              backgroundColor: saving ? colors.mutedForeground : colors.primary,
            },
          ]}
        >
          {saving ? (
            <ActivityIndicator color="#fff" />
          ) : (
            <Text style={styles.btnText}>{t.auth.continueToApp}</Text>
          )}
        </Pressable>
      </View>
    </View>
  );

  if (Platform.OS === "web") {
    return screen;
  }

  return <AuthLoginBackground>{screen}</AuthLoginBackground>;
}

const styles = StyleSheet.create({
  // Content-sized on native: the auth card hugs the form, the shell scrolls.
  screen: { flexShrink: 1 },
  body: {
    width: "100%",
    maxWidth: 420,
    alignSelf: "center",
    paddingHorizontal: 24,
    gap: 16,
    marginTop: Platform.OS === "web" ? 8 : 40,
  },
  title: { fontSize: 26, fontWeight: "800" },
  sub: { fontSize: 14, lineHeight: 20, marginBottom: 8 },
  btn: {
    marginTop: 12,
    paddingVertical: 14,
    borderRadius: 14,
    alignItems: "center",
  },
  btnText: { color: "#fff", fontWeight: "700", fontSize: 15 },
});
