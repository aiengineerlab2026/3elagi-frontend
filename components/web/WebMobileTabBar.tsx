import { Link, usePathname, type Href } from "expo-router";
import {
  CalendarClock,
  HelpCircle,
  History,
  Home,
  Info,
  MoreHorizontal,
  Stethoscope,
  User,
  Users,
  ClipboardList,
  type LucideIcon,
} from "lucide-react-native";
import React, { useState } from "react";
import { Pressable, StyleSheet, Text, View } from "react-native";
import { AppHelpMoreMenu } from "@/components/nav/AppHelpMoreMenu";
import { isSignedIn } from "@/domains/auth/session";
import { useAuthStore } from "@/domains/auth/store";
import { useColors } from "@/hooks/useColors";
import { useI18n } from "@/hooks/useI18n";

type TabLink = {
  kind: "link";
  key: string;
  href: Href;
  title: string;
  Icon: LucideIcon;
  isActive: (pathname: string) => boolean;
  hidden?: boolean;
};

type TabAction = {
  kind: "action";
  key: string;
  title: string;
  Icon: LucideIcon;
  onPress: () => void;
  active?: boolean;
};

type TabItem = TabLink | TabAction;

interface Props {
  height: number;
  bottomGap: number;
}

export function WebMobileTabBar({ height, bottomGap }: Props) {
  const colors = useColors();
  const { t } = useI18n();
  const pathname = usePathname();
  const profile = useAuthStore((s) => s.profile);
  const accessToken = useAuthStore((s) => s.accessToken);
  const role = useAuthStore((s) => s.role);
  const signedIn = isSignedIn(profile, accessToken);
  const isDoctor = role?.toLowerCase() === "doctor";
  const [helpMoreOpen, setHelpMoreOpen] = useState(false);

  const guestItems: TabItem[] = [
    {
      kind: "link",
      key: "home",
      href: "/(tabs)",
      title: t.tabs.home,
      Icon: Home,
      isActive: (path) =>
        path === "/" ||
        path === "/(tabs)" ||
        (path.includes("(tabs)") &&
          !path.includes("/for-doctors") &&
          !path.includes("/faq") &&
          !path.includes("/about-us")),
    },
    {
      kind: "link",
      key: "for-doctors",
      href: "/(tabs)/for-doctors",
      title: t.tabs.forDoctors,
      Icon: Stethoscope,
      isActive: (path) => path.includes("/for-doctors"),
    },
    {
      kind: "link",
      key: "about",
      href: "/(tabs)/about-us",
      title: t.tabs.aboutUs,
      Icon: Info,
      isActive: (path) => path.includes("/about-us"),
    },
    {
      kind: "link",
      key: "help",
      href: "/(tabs)/faq",
      title: t.tabs.help,
      Icon: HelpCircle,
      isActive: (path) => path.includes("/faq"),
    },
    {
      kind: "action",
      key: "more",
      title: t.tabs.more,
      Icon: MoreHorizontal,
      onPress: () => setHelpMoreOpen(true),
      active: helpMoreOpen,
    },
  ];

  const signedInItems: TabItem[] = [
    {
      kind: "link",
      key: "home",
      href: "/(tabs)",
      title: t.tabs.home,
      Icon: Home,
      isActive: (path) =>
        path === "/" ||
        path === "/(tabs)" ||
        (path.includes("(tabs)") &&
          !path.includes("/appointments") &&
          !path.includes("/history") &&
          !path.includes("/records") &&
          !path.includes("/patients") &&
          !path.includes("/profile") &&
          !path.includes("/faq") &&
          !path.includes("/documentation") &&
          !path.includes("/assistant")),
    },
    {
      kind: "link",
      key: "appointments",
      href: "/(tabs)/appointments",
      title: t.tabs.tabBarSchedule,
      Icon: CalendarClock,
      isActive: (path) => path.includes("/appointments"),
    },
    {
      kind: "link",
      key: "history",
      href: "/(tabs)/history",
      title: t.tabs.tabBarChats,
      Icon: History,
      isActive: (path) => path.includes("/history") || path.includes("/chat/"),
    },
    {
      kind: "link",
      key: "records",
      href: "/(tabs)/records",
      title: t.tabs.records,
      Icon: ClipboardList,
      isActive: (path) => path.includes("/records") || path.includes("/medical"),
      hidden: isDoctor,
    },
    {
      kind: "link",
      key: "patients",
      href: "/(tabs)/patients",
      title: t.tabs.patients,
      Icon: Users,
      isActive: (path) => path.includes("/patients"),
      hidden: !isDoctor,
    },
    {
      kind: "link",
      key: "profile",
      href: "/(tabs)/profile",
      title: t.tabs.profile,
      Icon: User,
      isActive: (path) => path.includes("/profile"),
    },
    {
      kind: "link",
      key: "help",
      href: isDoctor ? "/(tabs)/documentation" : "/(tabs)/faq",
      title: t.tabs.help,
      Icon: HelpCircle,
      isActive: (path) =>
        path.includes("/faq") ||
        path.includes("/documentation") ||
        path.includes("/contact"),
    },
    {
      kind: "action",
      key: "more",
      title: t.tabs.more,
      Icon: MoreHorizontal,
      onPress: () => setHelpMoreOpen(true),
      active: helpMoreOpen,
    },
  ];

  const items = (signedIn ? signedInItems : guestItems).filter(
    (item) => !(item.kind === "link" && item.hidden),
  );

  return (
    <>
      <View
        style={[
          styles.bar,
          {
            height,
            paddingBottom: bottomGap,
            backgroundColor: colors.card,
            borderTopColor: colors.border,
          },
        ]}
      >
        {items.map((item) => {
          if (item.kind === "action") {
            const tint = item.active ? colors.primary : colors.mutedForeground;
            return (
              <Pressable
                key={item.key}
                onPress={item.onPress}
                style={styles.tab}
                accessibilityRole="button"
                accessibilityLabel={item.title}
              >
                <item.Icon color={tint} size={22} />
                <Text style={[styles.label, { color: tint }]} numberOfLines={1}>
                  {item.title}
                </Text>
              </Pressable>
            );
          }

          const active = item.isActive(pathname);
          const tint = active ? colors.primary : colors.mutedForeground;

          return (
            <Link key={item.key} href={item.href} asChild>
              <Pressable
                style={styles.tab}
                accessibilityRole="button"
                accessibilityLabel={item.title}
              >
                <item.Icon color={tint} size={22} />
                <Text style={[styles.label, { color: tint }]} numberOfLines={1}>
                  {item.title}
                </Text>
              </Pressable>
            </Link>
          );
        })}
      </View>

      <AppHelpMoreMenu visible={helpMoreOpen} onClose={() => setHelpMoreOpen(false)} />
    </>
  );
}

const styles = StyleSheet.create({
  bar: {
    flexDirection: "row",
    alignItems: "flex-start",
    borderTopWidth: StyleSheet.hairlineWidth,
    paddingTop: 6,
  },
  tab: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    gap: 2,
    minWidth: 0,
    paddingHorizontal: 2,
  },
  label: {
    fontSize: 10,
    fontWeight: "600",
  },
});
