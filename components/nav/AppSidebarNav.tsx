import { LinearGradient } from "expo-linear-gradient";
import { Href, usePathname, useRouter, useSegments } from "expo-router";
import {
  ChevronDown,
  ChevronLeft,
  ChevronRight,
  CircleHelp,
  LogIn,
  LogOut,
  Mail,
  PanelLeftClose,
  PanelLeftOpen,
  Settings,
  UserPlus,
} from "lucide-react-native";
import React from "react";
import {
  Alert,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  UIManager,
  View,
} from "react-native";
import { Ask3elagiAiSidebarButton } from "@/components/assistant/Ask3elagiAiSidebarButton";
import {
  ask3elagiAiTriggerInSidebar,
  shouldHideAsk3elagiAiOnRoute,
} from "@/components/assistant/ask3elagiAiTrigger";
import { Logo3elagi } from "@/components/Logo3elagi";
import { AppHelpMoreMenu } from "@/components/nav/AppHelpMoreMenu";
import { AppSettingsModal } from "@/components/nav/AppSettingsModal";
import {
  APP_NAV_GROUP_ICONS,
  filterAppNavItems,
  groupAppNavItems,
  HOME_NAV_RESET_EVENT,
} from "@/constants/appNav";
import { LOGO_HEIGHT } from "@/constants/brand";
import { useAiEnabled } from "@/domains/ai/aiPreference";
import { useAuthStore } from "@/domains/auth/store";
import { useProductTourStore, currentTourStep } from "@/domains/onboarding/productTourStore";
import { TourAnchor } from "@/components/onboarding/TourAnchor";
import { tourAnchorDataSet } from "@/domains/onboarding/tourAnchorStore";
import { isSignedIn } from "@/domains/auth/session";
import { navigateToWelcome } from "@/domains/auth/navigation";
import { useNotificationsStore } from "@/domains/notifications/store";
import { useChatStore } from "@/domains/chat/store";
import { useAccentGradient, useColors } from "@/hooks/useColors";
import { useI18n } from "@/hooks/useI18n";
import { useWebLayout } from "@/hooks/useWebLayout";
import { emit } from "@/utils/eventBus";
import { alignText, flexRow } from "@/utils/rtl";
import { webConfirm } from "@/utils/webConfirm";

if (
  Platform.OS === "android" &&
  UIManager.setLayoutAnimationEnabledExperimental
) {
  UIManager.setLayoutAnimationEnabledExperimental(true);
}

type Props = {
  onNavigate?: () => void;
  showBrand?: boolean;
  /** Icon-only rail (desktop web). */
  collapsed?: boolean;
  /** Shows the rail toggle when provided; also used to expand on menu taps while collapsed. */
  onToggleCollapse?: () => void;
};

export function AppSidebarNav({
  onNavigate,
  showBrand = true,
  collapsed = false,
  onToggleCollapse,
}: Props) {
  const colors = useColors();
  const accentGradient = useAccentGradient();
  const { t, isRTL, locale } = useI18n();
  const router = useRouter();
  const pathname = usePathname();
  const segments = useSegments();
  const { isTablet } = useWebLayout();
  const hydrated = useAuthStore((s) => s.hydrated);
  const role = useAuthStore((s) => s.role);
  const profile = useAuthStore((s) => s.profile);
  const accessToken = useAuthStore((s) => s.accessToken);
  const logout = useAuthStore((s) => s.logout);
  const signedIn = isSignedIn(profile, accessToken);
  const unreadCount = useNotificationsStore((s) => s.unreadCount);
  const chatUnreadCount = useChatStore((s) =>
    s.conversations.reduce((total, c) => total + (c.unreadCount ?? 0), 0),
  );
  const aiEnabled = useAiEnabled();
  const roleOk =
    ["patient", "doctor", "hospital"].includes(role?.toLowerCase() ?? "");
  const canUseAskAi =
    hydrated &&
    (!signedIn || roleOk) &&
    aiEnabled &&
    !shouldHideAsk3elagiAiOnRoute(pathname, segments as string[]) &&
    ask3elagiAiTriggerInSidebar(isTablet);
  const tourActive = useProductTourStore((s) => s.active);
  const tourPhase = useProductTourStore((s) => s.phase);
  const tourStepIndex = useProductTourStore((s) => s.stepIndex);
  const tourStep = currentTourStep(tourPhase, tourStepIndex);
  const advanceOnAnchorTap = useProductTourStore((s) => s.advanceOnAnchorTap);
  const highlightChatHistory = tourActive && tourStep?.anchor === "nav-history";
  const dir = flexRow(isRTL);
  const textAlign = alignText(isRTL);
  const isArabic = locale === "ar";
  const navFontSize = isArabic ? 17 : 14;

  const items = filterAppNavItems(role, { signedIn, aiEnabled }).map((item) => ({
    ...item,
    active: item.match(pathname),
  }));
  const sections = groupAppNavItems(items);
  // Groups start closed; opening one is a per-session preference.
  const [openGroups, setOpenGroups] = React.useState<Record<string, boolean>>({});
  const [settingsOpen, setSettingsOpen] = React.useState(false);
  const [helpMoreOpen, setHelpMoreOpen] = React.useState(false);
  const scrollRef = React.useRef<ScrollView>(null);

  const isGroupExpanded = (group: string, hasActive: boolean) => {
    if (group === "activity" && highlightChatHistory) return true;
    return group in openGroups ? openGroups[group] : hasActive;
  };

  const toggleGroup = (group: string, hasActive: boolean) =>
    setOpenGroups((prev) => {
      const expanded = group in prev ? prev[group] : hasActive;
      return { ...prev, [group]: !expanded };
    });

  const handleLogout = () => {
    const confirmed =
      Platform.OS === "web"
        ? webConfirm(t.tabs.logout, t.tabs.logoutConfirm)
        : true;

    if (Platform.OS !== "web") {
      Alert.alert(t.tabs.logout, t.tabs.logoutConfirm, [
        { text: t.common.cancel, style: "cancel" },
        {
          text: t.tabs.logout,
          style: "destructive",
          onPress: () => {
            logout();
            onNavigate?.();
            navigateToWelcome(router);
          },
        },
      ]);
      return;
    }

    if (!confirmed) return;
    logout();
    onNavigate?.();
    navigateToWelcome(router);
  };

  const go = (href: Href) => {
    onNavigate?.();
    // Home lands on the specialities grid even when the tab is already open
    // (router.navigate is a no-op there, so the drilled-in roster would stay).
    if (String(href) === "/(tabs)") emit(HOME_NAV_RESET_EVENT);
    // Tabs: navigate without stacking so Back leaves detail screens, not tabs.
    router.navigate(href);
  };

  const renderNavItem = ({ href, labelKey, active, Icon }: (typeof items)[number]) => {
    const badgeCount =
      labelKey === "notifications" ? unreadCount : labelKey === "history" ? chatUnreadCount : 0;
    const isTourHistory = labelKey === "history" && !collapsed;

    const navItemStyle = ({ pressed, hovered }: { pressed: boolean; hovered?: boolean }) => [
      styles.navItem,
      collapsed && styles.navItemRail,
      collapsed && active && styles.navItemRailActive,
      {
        flexDirection: dir,
        backgroundColor: active
          ? colors.accent
          : pressed || hovered
            ? colors.muted
            : "transparent",
        borderLeftWidth: active && !isRTL && !collapsed ? 3 : 0,
        borderRightWidth: active && isRTL && !collapsed ? 3 : 0,
        borderLeftColor: active && !isRTL ? colors.primary : "transparent",
        borderRightColor: active && isRTL ? colors.primary : "transparent",
      },
    ];

    const navItemContent = (
      <>
        <Icon
          size={18}
          color={active ? colors.primary : colors.mutedForeground}
          strokeWidth={active ? 2.25 : 2}
        />
        {collapsed ? (
          badgeCount > 0 ? (
            <View style={[styles.railDot, active && styles.railDotActive]} />
          ) : null
        ) : (
          <>
            <Text
              style={[
                styles.navLabel,
                {
                  color: active ? colors.primary : colors.foreground,
                  textAlign,
                  writingDirection: isRTL ? "rtl" : "ltr",
                  fontSize: navFontSize,
                  fontWeight: active ? "600" : "500",
                },
              ]}
            >
              {t.tabs[labelKey]}
            </Text>
            {badgeCount > 0 ? (
              <View style={styles.badge}>
                <Text style={styles.badgeText}>
                  {badgeCount > 99 ? "99+" : String(badgeCount)}
                </Text>
              </View>
            ) : null}
          </>
        )}
      </>
    );

    if (isTourHistory) {
      return (
        <TourAnchor key={String(href)} id="nav-history">
          <Pressable
            testID="nav-history"
            {...tourAnchorDataSet("nav-history")}
            onPress={() => {
              advanceOnAnchorTap("nav-history");
              go(href);
            }}
            accessibilityRole="button"
            accessibilityLabel={t.tabs[labelKey]}
            accessibilityState={{ selected: active }}
            style={navItemStyle}
          >
            {navItemContent}
          </Pressable>
        </TourAnchor>
      );
    }

    return (
      <Pressable
        key={String(href)}
        testID={`nav-${labelKey}`}
        onPress={() => go(href)}
        accessibilityRole="button"
        accessibilityLabel={t.tabs[labelKey]}
        accessibilityState={{ selected: active }}
        style={navItemStyle}
      >
        {navItemContent}
      </Pressable>
    );
  };

  const renderSettingsButton = (rail = false) => (
    <Pressable
      onPress={() => setSettingsOpen(true)}
      accessibilityRole="button"
      accessibilityLabel={t.settings.preferences}
      style={({ pressed, hovered }: { pressed: boolean; hovered?: boolean }) => [
        styles.navItem,
        rail && styles.navItemRail,
        {
          flexDirection: dir,
          backgroundColor: pressed || hovered ? colors.muted : "transparent",
        },
      ]}
    >
      <Settings size={18} color={colors.mutedForeground} strokeWidth={2} />
      {rail || collapsed ? null : (
        <Text
          style={[
            styles.navLabel,
            {
              color: colors.foreground,
              textAlign,
              writingDirection: isRTL ? "rtl" : "ltr",
              fontSize: navFontSize,
              fontWeight: "500",
            },
          ]}
        >
          {t.settings.preferences}
        </Text>
      )}
    </Pressable>
  );

  const renderHelpMoreButton = (rail = false) => (
    <Pressable
      onPress={() => setHelpMoreOpen(true)}
      accessibilityRole="button"
      accessibilityLabel={t.tabs.helpAndMore}
      style={({ pressed, hovered }: { pressed: boolean; hovered?: boolean }) => [
        styles.navItem,
        rail && styles.navItemRail,
        {
          flexDirection: dir,
          backgroundColor: pressed || hovered ? colors.muted : "transparent",
        },
      ]}
    >
      <CircleHelp size={18} color={colors.mutedForeground} strokeWidth={2} />
      {rail || collapsed ? null : (
        <Text
          style={[
            styles.navLabel,
            {
              color: colors.foreground,
              textAlign,
              writingDirection: isRTL ? "rtl" : "ltr",
              fontSize: navFontSize,
              fontWeight: "500",
            },
          ]}
        >
          {t.tabs.helpAndMore}
        </Text>
      )}
    </Pressable>
  );

  const renderContactButton = (rail = false) => (
    <Pressable
      onPress={() => {
        onNavigate?.();
        go("/contact");
      }}
      accessibilityRole="button"
      accessibilityLabel={t.tabs.contactUs}
      style={({ pressed, hovered }: { pressed: boolean; hovered?: boolean }) => [
        styles.navItem,
        rail && styles.navItemRail,
        {
          flexDirection: dir,
          backgroundColor: pressed || hovered ? colors.muted : "transparent",
        },
      ]}
    >
      <Mail size={18} color={colors.mutedForeground} strokeWidth={2} />
      {rail || collapsed ? null : (
        <Text
          style={[
            styles.navLabel,
            {
              color: colors.foreground,
              textAlign,
              writingDirection: isRTL ? "rtl" : "ltr",
              fontSize: navFontSize,
              fontWeight: "500",
            },
          ]}
        >
          {t.tabs.contactUs}
        </Text>
      )}
    </Pressable>
  );

  return (
    <View style={styles.root}>
      <ScrollView
        ref={scrollRef}
        style={styles.scroll}
        contentContainerStyle={[styles.scrollContent, collapsed && styles.contentRail]}
        showsVerticalScrollIndicator={false}
        keyboardShouldPersistTaps="handled"
        bounces={false}
      >
      {showBrand || onToggleCollapse ? (
        <View
          style={[
            styles.brandRow,
            { flexDirection: dir, alignItems: "center" },
            // Rail: mark above the toggle, both centred in the collapsed column.
            collapsed && styles.brandRowRail,
          ]}
        >
          {showBrand ? (
            <View style={collapsed ? undefined : styles.brandLogo}>
              <Logo3elagi
                height={collapsed ? 26 : LOGO_HEIGHT.sidebar}
                markOnly={collapsed}
              />
            </View>
          ) : null}
          {onToggleCollapse ? (
            <Pressable
              onPress={onToggleCollapse}
              accessibilityRole="button"
              accessibilityLabel={t.tabs.menu}
              style={({ pressed, hovered }: { pressed: boolean; hovered?: boolean }) => [
                styles.iconBtn,
                { backgroundColor: pressed || hovered ? colors.muted : "transparent" },
              ]}
            >
              {collapsed ? (
                <PanelLeftOpen size={18} color={colors.mutedForeground} />
              ) : (
                <PanelLeftClose size={18} color={colors.mutedForeground} />
              )}
            </Pressable>
          ) : null}
        </View>
      ) : null}

      <View style={styles.nav}>
        {sections.map((section) => {
          const hasActive = section.items.some((item) => item.active);
          const expanded =
            !section.group ||
            collapsed ||
            (section.group ? isGroupExpanded(section.group, hasActive) : false);

          return (
            <View key={String(section.items[0].href)} style={styles.navSection}>
              {/* The rail has no room for headers; a divider keeps the grouping. */}
              {section.group && collapsed ? (
                <View style={[styles.railDivider, { backgroundColor: colors.border }]} />
              ) : null}
              {section.group && !collapsed ? (
                // Reads as a menu item like any other, with a chevron marking
                // that it opens rather than navigates.
                (() => {
                  const GroupIcon = APP_NAV_GROUP_ICONS[section.group];
                  return (
                    <Pressable
                      onPress={() => toggleGroup(section.group!, hasActive)}
                      accessibilityRole="button"
                      accessibilityState={{ expanded }}
                      accessibilityLabel={t.tabs[section.group]}
                      style={({
                        pressed,
                        hovered,
                      }: {
                        pressed: boolean;
                        hovered?: boolean;
                      }) => [
                        styles.navItem,
                        {
                          flexDirection: dir,
                          backgroundColor:
                            pressed || hovered ? colors.muted : "transparent",
                        },
                      ]}
                    >
                      <GroupIcon size={18} color={colors.mutedForeground} strokeWidth={2} />
                      <Text
                        style={[
                          styles.navLabel,
                          {
                            color: colors.foreground,
                            textAlign,
                            writingDirection: isRTL ? "rtl" : "ltr",
                            fontSize: navFontSize,
                            fontWeight: "500",
                          },
                        ]}
                      >
                        {t.tabs[section.group]}
                      </Text>
                      {expanded ? (
                        <ChevronDown size={16} color={colors.mutedForeground} />
                      ) : isRTL ? (
                        <ChevronLeft size={16} color={colors.mutedForeground} />
                      ) : (
                        <ChevronRight size={16} color={colors.mutedForeground} />
                      )}
                    </Pressable>
                  );
                })()
              ) : null}
              {expanded
                ? section.items.map(renderNavItem)
                : null}
            </View>
          );
        })}
      </View>
      </ScrollView>

      <View
        style={[
          styles.footer,
          collapsed ? styles.footerRail : styles.footerExpanded,
        ]}
      >
        {collapsed ? (
          <>
            {renderSettingsButton(true)}
            {renderHelpMoreButton(true)}
            {renderContactButton(true)}
          </>
        ) : (
          <View style={styles.navSection}>
            {renderSettingsButton()}
            {renderHelpMoreButton()}
            {renderContactButton()}
          </View>
        )}

        {canUseAskAi ? (
          <Ask3elagiAiSidebarButton collapsed={collapsed} navFontSize={navFontSize} />
        ) : null}

        {signedIn ? (
          <Pressable
            onPress={handleLogout}
            accessibilityRole="button"
            accessibilityLabel={t.tabs.logout}
            style={({ pressed, hovered }: { pressed: boolean; hovered?: boolean }) => [
              styles.logoutBtn,
              collapsed && styles.navItemRail,
              {
                flexDirection: dir,
                borderColor: pressed || hovered ? "#ef4444" : "#fecaca",
                backgroundColor: pressed || hovered ? "#fef2f2" : "transparent",
              },
            ]}
          >
            <LogOut size={18} color="#ef4444" />
            {collapsed ? null : (
              <Text
                style={[
                  styles.logoutText,
                  {
                    textAlign,
                    writingDirection: isRTL ? "rtl" : "ltr",
                    fontSize: navFontSize,
                  },
                ]}
              >
                {t.tabs.logout}
              </Text>
            )}
          </Pressable>
        ) : (
          <>
            <Pressable
              onPress={() => go("/auth/login")}
              accessibilityRole="button"
              accessibilityLabel={t.auth.logIn}
              style={({ pressed, hovered }: { pressed: boolean; hovered?: boolean }) => [
                styles.authCta,
                styles.authCtaLogin,
                collapsed && styles.authCtaRail,
                { shadowColor: colors.primary, opacity: pressed || hovered ? 0.92 : 1 },
              ]}
            >
              <LinearGradient
                colors={accentGradient}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 1 }}
                style={[
                  styles.authCtaGradient,
                  { flexDirection: dir },
                  collapsed && styles.authCtaGradientRail,
                ]}
              >
                <LogIn size={18} color="#FFFFFF" />
                {collapsed ? null : (
                  <Text
                    style={[
                      styles.navLabel,
                      {
                        color: "#FFFFFF",
                        textAlign,
                        writingDirection: isRTL ? "rtl" : "ltr",
                        fontWeight: "800",
                        fontSize: navFontSize,
                      },
                    ]}
                  >
                    {t.auth.logIn}
                  </Text>
                )}
              </LinearGradient>
            </Pressable>
            <Pressable
              onPress={() => go("/auth/signup")}
              accessibilityRole="button"
              accessibilityLabel={t.auth.register}
              style={({ pressed, hovered }: { pressed: boolean; hovered?: boolean }) => [
                styles.logoutBtn,
                styles.authCtaSignup,
                collapsed && styles.authCtaRail,
                {
                  flexDirection: dir,
                  borderColor: colors.primary,
                  backgroundColor: `${colors.primary}${pressed || hovered ? "29" : "14"}`,
                },
              ]}
            >
              <UserPlus size={18} color={colors.primary} />
              {collapsed ? null : (
                <Text
                  style={[
                    styles.navLabel,
                    {
                      color: colors.primary,
                      textAlign,
                      writingDirection: isRTL ? "rtl" : "ltr",
                      fontWeight: "800",
                      fontSize: navFontSize,
                    },
                  ]}
                >
                  {t.auth.register}
                </Text>
              )}
            </Pressable>
          </>
        )}
      </View>

      <AppSettingsModal visible={settingsOpen} onClose={() => setSettingsOpen(false)} />
      <AppHelpMoreMenu
        visible={helpMoreOpen}
        onClose={() => setHelpMoreOpen(false)}
        onNavigate={onNavigate}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
    minHeight: 0,
  },
  scroll: {
    flex: 1,
    minHeight: 0,
  },
  scrollContent: {
    flexGrow: 1,
    paddingHorizontal: 14,
    paddingTop: 12,
    paddingBottom: 12,
    gap: 10,
  },
  contentRail: {
    paddingHorizontal: 6,
    alignItems: "center",
  },
  brandRow: {
    alignItems: "center",
    justifyContent: "space-between",
    gap: 8,
    marginBottom: 4,
  },
  brandLogo: { flex: 1, alignItems: "center" },
  brandRowRail: {
    flexDirection: "column",
    justifyContent: "center",
    gap: 4,
    marginBottom: 0,
  },
  iconBtn: {
    width: 32,
    height: 32,
    alignItems: "center",
    justifyContent: "center",
    borderRadius: 8,
  },
  navSection: {
    gap: 2,
  },
  railDivider: {
    height: StyleSheet.hairlineWidth,
    alignSelf: "stretch",
    marginVertical: 8,
  },
  nav: { gap: 2 },
  navItem: {
    alignItems: "center",
    gap: 10,
    paddingHorizontal: 14,
    paddingVertical: 11,
    borderRadius: 12,
  },
  navItemRail: {
    alignSelf: "center",
    justifyContent: "center",
    width: 36,
    height: 36,
    paddingHorizontal: 0,
    paddingVertical: 0,
    borderRadius: 10,
  },
  navItemRailActive: {
    width: 38,
    height: 38,
    borderRadius: 11,
  },
  railDot: {
    position: "absolute",
    top: 4,
    right: 4,
    width: 7,
    height: 7,
    borderRadius: 3.5,
    backgroundColor: "#ef4444",
  },
  railDotActive: {
    top: 5,
    right: 5,
  },
  navLabel: { fontSize: 14, flex: 1 },
  badge: {
    minWidth: 20,
    height: 20,
    borderRadius: 10,
    paddingHorizontal: 6,
    backgroundColor: "#ef4444",
    alignItems: "center",
    justifyContent: "center",
  },
  badgeText: {
    color: "#fff",
    fontSize: 11,
    fontWeight: "800",
  },
  footer: {
    gap: 8,
    flexShrink: 0,
    paddingBottom: 16,
  },
  footerExpanded: {
    paddingHorizontal: 14,
    paddingTop: 8,
  },
  footerRail: {
    paddingHorizontal: 6,
    paddingTop: 8,
    alignItems: "center",
  },
  prefPanel: {
    gap: 2,
    padding: 6,
    borderRadius: 12,
    borderWidth: StyleSheet.hairlineWidth,
  },
  prefMeasure: {
    position: "absolute",
    opacity: 0,
    width: "100%",
    left: 0,
    top: 0,
    zIndex: -1,
  },
  prefBodyClip: {
    overflow: "hidden",
  },
  prefNavItem: {
    alignItems: "center",
    gap: 10,
    paddingHorizontal: 14,
    paddingVertical: 11,
    borderRadius: 12,
    minWidth: 0,
  },
  logoutBtn: {
    alignItems: "center",
    gap: 10,
    paddingHorizontal: 12,
    paddingVertical: 11,
    borderRadius: 12,
    borderWidth: 1,
  },
  rateUsCta: {
    borderRadius: 12,
    overflow: "hidden",
    marginTop: 10,
    marginBottom: 4,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.32,
    shadowRadius: 10,
    elevation: 4,
  },
  rateUsCtaRail: {
    marginBottom: 8,
  },
  rateUsGradient: {
    alignItems: "center",
    gap: 10,
    paddingHorizontal: 12,
    paddingVertical: 12,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: "rgba(255,255,255,0.45)",
  },
  rateUsText: {
    color: "#422006",
    fontWeight: "800",
    flex: 1,
    letterSpacing: 0.15,
  },
  authCta: {
    borderRadius: 12,
    overflow: "hidden",
  },
  authCtaLogin: {
    // Breathing room between the preferences block (Contact us) and the CTAs.
    marginTop: 22,
    // shadowColor is set inline from the active accent.
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 10,
    elevation: 4,
  },
  authCtaGradient: {
    alignItems: "center",
    gap: 10,
    paddingHorizontal: 12,
    paddingVertical: 12,
  },
  authCtaSignup: {
    borderWidth: 2,
  },
  // Rail: same compact square as every other icon item.
  authCtaRail: {
    alignSelf: "center",
    width: 36,
    height: 36,
    minHeight: 36,
    marginTop: 8,
    paddingHorizontal: 0,
    paddingVertical: 0,
    borderRadius: 10,
    overflow: "hidden",
    justifyContent: "center",
    alignItems: "center",
  },
  authCtaGradientRail: {
    width: "100%",
    height: "100%",
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: 0,
    paddingVertical: 0,
    gap: 0,
  },
  logoutText: { color: "#ef4444", fontWeight: "700", fontSize: 14, flex: 1 },
});
