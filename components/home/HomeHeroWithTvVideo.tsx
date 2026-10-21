import React from "react";
import { Platform, StyleSheet, View } from "react-native";
import { PublicHeroMediaSection } from "@/components/marketing/PublicHeroMediaSection";
import { TvFramedVideo } from "@/components/marketing/TvFramedVideo";
import { useI18n } from "@/hooks/useI18n";
import { useWebLayout } from "@/hooks/useWebLayout";
import { flexRow } from "@/utils/rtl";

interface Props {
  children: React.ReactNode;
}

function NativeTvBanner() {
  return (
    <View style={styles.nativeTvInline}>
      <TvFramedVideo />
    </View>
  );
}

/** Signed-in home hero: dashboard copy beside (desktop) or above (mobile) the TV banner video. */
export function HomeHeroWithTvVideo({ children }: Props) {
  const { isDesktop } = useWebLayout();
  const { isRTL } = useI18n();
  const dir = flexRow(isRTL);
  const nativeTvBanner = <NativeTvBanner />;

  if (isDesktop) {
    return (
      <View style={[styles.shellDesktop, { flexDirection: dir }]}>
        <View style={styles.copyDesktop}>{children}</View>
        <View style={styles.visualDesktop}>
          <TvFramedVideo />
        </View>
      </View>
    );
  }

  // Native: TV sits right under the greeting, before quick actions.
  if (Platform.OS !== "web" && React.isValidElement(children)) {
    return (
      <View style={styles.shellMobile}>
        {React.cloneElement(children, { mediaAfterGreeting: nativeTvBanner })}
      </View>
    );
  }

  return (
    <View style={styles.shellMobile}>
      {children}
      <PublicHeroMediaSection />
    </View>
  );
}

const styles = StyleSheet.create({
  shellDesktop: {
    marginHorizontal: 16,
    marginTop: 12,
    marginBottom: 4,
    alignItems: "flex-start",
    gap: 16,
  },
  copyDesktop: {
    flex: 5,
    minWidth: 300,
    minHeight: 0,
    alignSelf: "flex-start",
  },
  visualDesktop: {
    flex: 6,
    minWidth: 360,
    alignSelf: "flex-start",
  },
  shellMobile: {
    marginTop: 8,
    gap: 4,
  },
  nativeTvInline: {
    marginTop: 2,
    marginBottom: 4,
  },
});
