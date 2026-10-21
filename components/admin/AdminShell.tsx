import { Redirect, usePathname, useRouter } from "expo-router";
import {
  BookOpen,
  Coins,
  FileWarning,
  LayoutDashboard,
  LogOut,
  Mail,
  Megaphone,
  Menu,
  MessageCircle,
  MessageSquare,
  BarChart3,
  Building2,
  Scissors,
  Send,
  Star,
  Stethoscope,
  Trash2,
  UserPlus,
  X,
} from "lucide-react-native";
import React, { useCallback, useEffect, useState } from "react";
import {
  Modal,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
  useWindowDimensions,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Logo3elagi } from "@/components/Logo3elagi";
import { LOGO_HEIGHT } from "@/constants/brand";
import { ADMIN_MOBILE_MAX_WIDTH, adminPagePadding } from "@/constants/adminLayout";
import { getPostLogoutRoute } from "@/domains/auth/navigation";
import { isSignedIn } from "@/domains/auth/session";
import { useAuthStore } from "@/domains/auth/store";
import { useColors } from "@/hooks/useColors";

type AdminNavKey =
  | "doctors"
  | "doctorSignup"
  | "doctorWelcomeEmail"
  | "chats"
  | "contact"
  | "doctorRegistrations"
  | "doctorSpecialityChanges"
  | "appReviews"
  | "specialities"
  | "surgicalOperations"
  | "hospitals"
  | "pricing"
  | "rag"
  | "complaints"
  | "marketing"
  | "whatsapp"
  | "deletedAccounts"
  | "analytics";

const NAV: {
  key: AdminNavKey;
  label: string;
  href: string;
  Icon: React.ComponentType<{ size?: number; color?: string }>;
}[] = [
  { key: "doctors", label: "Doctors", href: "/admin", Icon: Stethoscope },
  {
    key: "doctorSignup",
    label: "Add doctor",
    href: "/admin/doctor-signup",
    Icon: UserPlus,
  },
  {
    key: "doctorWelcomeEmail",
    label: "Welcome email",
    href: "/admin/doctor-welcome-email",
    Icon: Send,
  },
  {
    key: "whatsapp",
    label: "WhatsApp",
    href: "/admin/whatsapp",
    Icon: MessageCircle,
  },
  { key: "chats", label: "Chats", href: "/admin/chats", Icon: MessageSquare },
  {
    key: "contact",
    label: "Contact inbox",
    href: "/admin/contact-messages",
    Icon: Mail,
  },
  {
    key: "marketing",
    label: "Marketing",
    href: "/admin/marketing",
    Icon: Megaphone,
  },
  {
    key: "doctorRegistrations",
    label: "Doctor registrations",
    href: "/admin/doctor-registrations",
    Icon: Stethoscope,
  },
  {
    key: "doctorSpecialityChanges",
    label: "Speciality changes",
    href: "/admin/doctor-speciality-changes",
    Icon: Stethoscope,
  },
  {
    key: "appReviews",
    label: "Rate us reviews",
    href: "/admin/app-reviews",
    Icon: Star,
  },
  {
    key: "specialities",
    label: "Specialities",
    href: "/admin/specialities",
    Icon: LayoutDashboard,
  },
  {
    key: "surgicalOperations",
    label: "Surgical operations",
    href: "/admin/surgical-operations",
    Icon: Scissors,
  },
  {
    key: "hospitals",
    label: "Hospitals",
    href: "/admin/hospitals",
    Icon: Building2,
  },
  {
    key: "pricing",
    label: "Credit pricing",
    href: "/admin/pricing",
    Icon: Coins,
  },
  { key: "rag", label: "RAG Sources", href: "/admin/rag", Icon: BookOpen },
  {
    key: "complaints",
    label: "Complaints",
    href: "/admin/complaints",
    Icon: FileWarning,
  },
  {
    key: "analytics",
    label: "Analytics",
    href: "/admin/analytics",
    Icon: BarChart3,
  },
  {
    key: "deletedAccounts",
    label: "Deleted accounts",
    href: "/admin/deleted-accounts",
    Icon: Trash2,
  },
];

function activeKey(pathname: string): AdminNavKey {
  if (pathname.includes("/admin/doctor-signup")) return "doctorSignup";
  if (pathname.includes("/admin/doctor-welcome-email")) return "doctorWelcomeEmail";
  if (pathname.includes("/admin/whatsapp")) return "whatsapp";
  if (pathname.includes("/admin/chats")) return "chats";
  if (pathname.includes("/admin/contact-messages")) return "contact";
  if (pathname.includes("/admin/doctor-registrations")) return "doctorRegistrations";
  if (pathname.includes("/admin/doctor-speciality-changes")) return "doctorSpecialityChanges";
  if (pathname.includes("/admin/app-reviews")) return "appReviews";
  if (pathname.includes("/admin/specialities")) return "specialities";
  if (pathname.includes("/admin/surgical-operations")) return "surgicalOperations";
  if (pathname.includes("/admin/hospitals")) return "hospitals";
  if (pathname.includes("/admin/pricing")) return "pricing";
  if (pathname.includes("/admin/rag")) return "rag";
  if (pathname.includes("/admin/complaints")) return "complaints";
  if (pathname.includes("/admin/marketing")) return "marketing";
  if (pathname.includes("/admin/deleted-accounts")) return "deletedAccounts";
  if (pathname.includes("/admin/analytics")) return "analytics";
  return "doctors";
}

interface Props {
  title: string;
  subtitle?: string;
  children: React.ReactNode;
}

function NavList({
  current,
  colors,
  compact,
  onNavigate,
}: {
  current: AdminNavKey;
  colors: ReturnType<typeof useColors>;
  compact: boolean;
  onNavigate: (href: string) => void;
}) {
  return (
    <>
      {NAV.map(({ key, label, href, Icon }) => {
        const active = current === key;
        return (
          <Pressable
            key={key}
            onPress={() => {
              if (!active) onNavigate(href);
            }}
            style={({ pressed }) => [
              styles.navItem,
              {
                backgroundColor: active
                  ? `${colors.primary}14`
                  : pressed
                    ? colors.muted
                    : "transparent",
                borderColor: active ? `${colors.primary}44` : "transparent",
              },
            ]}
          >
            <Icon
              size={18}
              color={active ? colors.primary : colors.mutedForeground}
            />
            <Text
              style={[
                styles.navLabel,
                compact && styles.navLabelCompact,
                {
                  color: active ? colors.primary : colors.foreground,
                  fontWeight: active ? "800" : "600",
                },
              ]}
              numberOfLines={2}
            >
              {label}
            </Text>
          </Pressable>
        );
      })}
    </>
  );
}

/** Admin shell — desktop sidenav; mobile drawer + full-width content. */
export function AdminShell({ title, subtitle, children }: Props) {
  const colors = useColors();
  const router = useRouter();
  const pathname = usePathname();
  const insets = useSafeAreaInsets();
  const { width } = useWindowDimensions();
  const compact = width <= ADMIN_MOBILE_MAX_WIDTH;
  const pagePadding = adminPagePadding(compact);

  const profile = useAuthStore((s) => s.profile);
  const accessToken = useAuthStore((s) => s.accessToken);
  const role = useAuthStore((s) => s.role);
  const logout = useAuthStore((s) => s.logout);
  const current = activeKey(pathname ?? "");
  const [navOpen, setNavOpen] = useState(false);

  const navigate = useCallback(
    (href: string) => {
      setNavOpen(false);
      router.push(href as "/admin");
    },
    [router],
  );

  useEffect(() => {
    setNavOpen(false);
  }, [pathname]);

  if (!isSignedIn(profile, accessToken)) {
    return <Redirect href="/auth/login" />;
  }
  if (role?.toLowerCase() !== "admin") {
    return <Redirect href="/welcome" />;
  }

  const sidebarBody = (
    <>
      <View style={styles.brand}>
        <Logo3elagi height={compact ? LOGO_HEIGHT.header : LOGO_HEIGHT.sidebar} />
        <Text style={[styles.brandLabel, { color: colors.mutedForeground }]}>
          Admin
        </Text>
      </View>

      <ScrollView
        style={styles.navScroll}
        contentContainerStyle={styles.navContent}
        showsVerticalScrollIndicator={false}
      >
        <NavList
          current={current}
          colors={colors}
          compact={compact}
          onNavigate={navigate}
        />
      </ScrollView>

      <Pressable
        onPress={() => {
          logout();
          router.replace(getPostLogoutRoute());
        }}
        style={({ pressed }) => [
          styles.logoutBtn,
          {
            borderColor: colors.border,
            backgroundColor: pressed ? colors.muted : "transparent",
          },
        ]}
      >
        <LogOut size={16} color={colors.foreground} />
        <Text style={[styles.logoutText, { color: colors.foreground }]}>
          Logout
        </Text>
      </Pressable>
    </>
  );

  return (
    <View style={[styles.root, { backgroundColor: colors.background }]}>
      {!compact ? (
        <View
          style={[
            styles.sidebar,
            {
              backgroundColor: colors.card,
              borderColor: colors.border,
              paddingTop: Math.max(insets.top, 20),
            },
          ]}
        >
          {sidebarBody}
        </View>
      ) : (
        <Modal
          visible={navOpen}
          animationType="slide"
          transparent
          onRequestClose={() => setNavOpen(false)}
        >
          <View style={styles.drawerBackdrop}>
            <View
              style={[
                styles.drawerPanel,
                {
                  backgroundColor: colors.card,
                  borderColor: colors.border,
                  paddingTop: Math.max(insets.top, 16),
                  paddingBottom: Math.max(insets.bottom, 16),
                },
              ]}
            >
              <Pressable
                onPress={() => setNavOpen(false)}
                style={styles.drawerClose}
                hitSlop={12}
                accessibilityLabel="Close menu"
              >
                <X size={22} color={colors.foreground} />
              </Pressable>
              {sidebarBody}
            </View>
            <Pressable
              style={styles.drawerScrim}
              onPress={() => setNavOpen(false)}
              accessibilityLabel="Close menu"
            />
          </View>
        </Modal>
      )}

      <View style={styles.main}>
        <View
          style={[
            styles.topBar,
            {
              borderBottomColor: colors.border,
              paddingTop: Math.max(insets.top, compact ? 12 : 20),
              paddingHorizontal: pagePadding,
            },
          ]}
        >
          {compact ? (
            <Pressable
              onPress={() => setNavOpen(true)}
              style={({ pressed }) => [
                styles.menuBtn,
                {
                  borderColor: colors.border,
                  backgroundColor: pressed ? colors.muted : colors.card,
                },
              ]}
              accessibilityLabel="Open admin menu"
            >
              <Menu size={20} color={colors.foreground} />
            </Pressable>
          ) : null}
          <View style={[styles.topBarText, compact && styles.topBarTextCompact]}>
            <Text
              style={[
                styles.title,
                compact && styles.titleCompact,
                { color: colors.foreground },
              ]}
              numberOfLines={2}
            >
              {title}
            </Text>
            {subtitle ? (
              <Text
                style={[styles.subtitle, { color: colors.mutedForeground }]}
                numberOfLines={3}
              >
                {subtitle}
              </Text>
            ) : null}
          </View>
        </View>
        <View style={styles.content}>{children}</View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
    flexDirection: "row",
    minHeight: "100%" as unknown as number,
    width: "100%",
  },
  sidebar: {
    width: 248,
    borderRightWidth: StyleSheet.hairlineWidth,
    paddingBottom: 16,
    paddingHorizontal: 14,
    gap: 16,
    flexShrink: 0,
  },
  drawerBackdrop: {
    flex: 1,
    flexDirection: "row",
  },
  drawerScrim: {
    flex: 1,
    backgroundColor: "rgba(15, 23, 42, 0.45)",
  },
  drawerPanel: {
    width: "86%",
    maxWidth: 320,
    borderRightWidth: StyleSheet.hairlineWidth,
    paddingHorizontal: 14,
    gap: 12,
  },
  drawerClose: {
    alignSelf: "flex-end",
    padding: 4,
    marginBottom: 4,
  },
  brand: {
    paddingHorizontal: 8,
    gap: 6,
    marginBottom: 4,
  },
  brandLabel: {
    fontSize: 12,
    fontWeight: "700",
    letterSpacing: 0.6,
    textTransform: "uppercase",
    marginLeft: 4,
  },
  navScroll: { flex: 1, minHeight: 0 },
  navContent: { gap: 4, paddingBottom: 12 },
  navItem: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    paddingHorizontal: 12,
    paddingVertical: 11,
    borderRadius: 12,
    borderWidth: 1,
  },
  navLabel: { fontSize: 14, flex: 1 },
  navLabelCompact: { fontSize: 15 },
  logoutBtn: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    borderWidth: 1,
    borderRadius: 12,
    paddingHorizontal: 12,
    paddingVertical: 11,
  },
  logoutText: { fontSize: 14, fontWeight: "700" },
  main: { flex: 1, minWidth: 0, minHeight: 0 },
  topBar: {
    flexDirection: "row",
    alignItems: "flex-start",
    gap: 12,
    paddingBottom: 16,
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
  menuBtn: {
    width: 42,
    height: 42,
    borderRadius: 12,
    borderWidth: 1,
    alignItems: "center",
    justifyContent: "center",
    marginTop: 2,
    flexShrink: 0,
  },
  topBarText: { flex: 1, gap: 4, minWidth: 0 },
  topBarTextCompact: { paddingTop: 2 },
  title: { fontSize: 24, fontWeight: "800", letterSpacing: -0.3 },
  titleCompact: { fontSize: 20, lineHeight: 26 },
  subtitle: { fontSize: 14, lineHeight: 20 },
  content: { flex: 1, minHeight: 0 },
});
