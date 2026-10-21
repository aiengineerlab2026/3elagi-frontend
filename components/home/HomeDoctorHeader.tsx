import React from "react";

import {

  Platform,

  StyleSheet,

  Text,

  View,

} from "react-native";

import { DoctorQuickActions } from "@/components/home/DoctorQuickActions";
import { HomeDoctorSummary } from "@/components/home/HomeDoctorSummary";
import type { DoctorDashboardMetrics } from "@/hooks/useDoctorDashboard";

import {

  DASHBOARD_INDIGO,

  DASHBOARD_INDIGO_LIGHT,

} from "@/constants/dashboardTheme";

import { surfaceCard, UI } from "@/constants/uiTokens";

import { useAuthStore } from "@/domains/auth/store";

import { IMMEDIATE_VIDEO_CALL_ENABLED } from "@/constants/features";

import { useColors } from "@/hooks/useColors";

import { useI18n } from "@/hooks/useI18n";

import { useWebLayout } from "@/hooks/useWebLayout";

import { alignText, flexRow } from "@/utils/rtl";



function greetingKey(): "morning" | "afternoon" | "evening" {

  const h = new Date().getHours();

  if (h < 12) return "morning";

  if (h < 17) return "afternoon";

  return "evening";

}



interface Props {

  immediateCallEnabled: boolean;

  togglingAvailability?: boolean;

  onToggleAvailability: (next: boolean) => void;

  /** Desktop hero row with TV video — greeting + quick actions in the copy column. */

  besideMedia?: boolean;

  /** Native mobile: TV banner inserted between greeting and quick actions. */

  mediaAfterGreeting?: React.ReactNode;

  metrics?: DoctorDashboardMetrics;

}



export function HomeDoctorHeader({

  immediateCallEnabled,

  togglingAvailability = false,

  onToggleAvailability,

  besideMedia = false,

  mediaAfterGreeting,

  metrics,

}: Props) {

  const colors = useColors();

  const { t, isRTL } = useI18n();

  const { isMobile, isDesktop } = useWebLayout();

  const compactHero = besideMedia && isDesktop;

  const dir = flexRow(isRTL);

  const textAlign = alignText(isRTL);

  const profile = useAuthStore((s) => s.profile);

  const displayName = profile?.name?.trim().split(/\s+/)[0] ?? "";

  const period = greetingKey();

  const greeting = displayName

    ? t.doctorDashboard.greetingNamed(period, displayName)

    : t.doctorDashboard.greeting(period);



  const greetingBlock = (

    <>

      <Text

        style={[

          compactHero ? styles.greetingCompact : styles.greeting,

          { color: colors.foreground, textAlign },

        ]}

      >

        {greeting}

      </Text>

      {compactHero ? (

        <Text style={[styles.subtextCompact, { color: DASHBOARD_INDIGO, textAlign }]}>

          {t.doctorDashboard.welcomeBanner}

        </Text>

      ) : (

        <>

          <Text style={[styles.bannerTag, { color: colors.accentForeground, textAlign }]}>

            {t.doctorDashboard.welcomeBanner}

          </Text>

          <Text style={[styles.subtitle, { color: colors.mutedForeground, textAlign }]}>

            {t.doctorDashboard.subtitle}

          </Text>

        </>

      )}

      {IMMEDIATE_VIDEO_CALL_ENABLED ? (

        <View

          style={[

            styles.statusPill,

            compactHero && styles.statusPillCompact,

            { backgroundColor: colors.card, flexDirection: dir },

          ]}

        >

          <View

            style={[

              styles.statusDot,

              { backgroundColor: immediateCallEnabled ? colors.success : colors.mutedForeground },

            ]}

          />

          <Text style={[styles.statusText, { color: colors.foreground, textAlign }]}>

            {immediateCallEnabled

              ? t.doctorDashboard.availabilityOn

              : t.doctorDashboard.availabilityOff}

          </Text>

        </View>

      ) : null}

    </>

  );



  const quickActions = (

    <DoctorQuickActions

      immediateCallEnabled={immediateCallEnabled}

      togglingAvailability={togglingAvailability}

      onToggleAvailability={onToggleAvailability}

      compact={compactHero || Platform.OS !== "web" || isMobile}

      flush={compactHero}

    />

  );



  return (

    <View style={[styles.wrap, besideMedia && isDesktop && styles.wrapBesideMedia]}>

      {compactHero ? (

        <>

          <View

            style={[

              styles.heroPanel,

              surfaceCard(colors.card, colors.border),

              Platform.select({

                web: { boxShadow: "0 1px 3px rgba(79,70,229,0.08)" },

                default: {},

              }),

            ]}

          >

            <View

              style={[

                styles.bannerCompact,

                {

                  backgroundColor: DASHBOARD_INDIGO_LIGHT,

                  borderLeftWidth: !isRTL ? 3 : 0,

                  borderRightWidth: isRTL ? 3 : 0,

                  borderLeftColor: DASHBOARD_INDIGO,

                  borderRightColor: DASHBOARD_INDIGO,

                },

              ]}

            >

              {greetingBlock}

            </View>

            <View style={[styles.actionsInset, { borderTopColor: `${DASHBOARD_INDIGO}22` }]}>

              {quickActions}

            </View>

          </View>

          {metrics ? <HomeDoctorSummary metrics={metrics} variant="inHero" /> : null}

        </>

      ) : (

        <>

          <View

            style={[

              styles.banner,

              styles.bannerDefault,

              surfaceCard(colors.card, colors.border),

              { backgroundColor: colors.accent },

            ]}

          >

            {greetingBlock}

          </View>

          {mediaAfterGreeting}

          <Text style={[styles.sectionLabel, { color: colors.foreground, textAlign }]}>

            {t.doctorDashboard.quickActions}

          </Text>

          {quickActions}

          {metrics ? <HomeDoctorSummary metrics={metrics} variant="inHero" /> : null}

        </>

      )}

    </View>

  );

}



const styles = StyleSheet.create({

  wrap: {

    paddingHorizontal: UI.space.md,

    paddingTop: UI.space.xs,

    paddingBottom: UI.space.xs,

    gap: UI.space.sm,

  },

  wrapBesideMedia: {

    paddingHorizontal: 0,

    paddingTop: 0,

    paddingBottom: 0,

  },

  heroPanel: {

    overflow: "hidden",

    borderRadius: UI.radius.card,

  },

  banner: {

    gap: 2,

  },

  bannerDefault: {

    padding: UI.space.md,

  },

  bannerCompact: {

    paddingHorizontal: 12,

    paddingTop: 8,

    paddingBottom: 4,

    gap: 1,

  },

  actionsInset: {

    paddingHorizontal: 8,

    paddingTop: 4,

    paddingBottom: 5,

    borderTopWidth: 1,

  },

  greeting: {

    fontSize: 24,

    fontWeight: "700",

    letterSpacing: -0.35,

    lineHeight: 30,

  },

  greetingCompact: {

    fontSize: 20,

    fontWeight: "700",

    letterSpacing: -0.3,

    lineHeight: 24,

  },

  subtextCompact: {

    fontSize: 13,

    fontWeight: "500",

    lineHeight: 15,

    opacity: 0.88,

  },

  bannerTag: {

    fontSize: 13,

    fontWeight: "600",

    lineHeight: 18,

  },

  subtitle: {

    fontSize: 14,

    lineHeight: 20,

    maxWidth: 520,

    marginTop: 2,

  },

  statusPill: {

    alignSelf: "flex-start",

    alignItems: "center",

    gap: 6,

    marginTop: 6,

    paddingHorizontal: 10,

    paddingVertical: 5,

    borderRadius: UI.radius.chip,

  },

  statusPillCompact: {

    marginTop: 6,

  },

  statusDot: {

    width: 7,

    height: 7,

    borderRadius: 4,

  },

  statusText: {

    fontSize: 11,

    fontWeight: "600",

  },

  sectionLabel: {

    fontSize: 14,

    fontWeight: "700",

    letterSpacing: -0.1,

  },

});

