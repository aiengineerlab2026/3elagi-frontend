import { Tabs } from "expo-router";
import {
  Bell,
  Bot,
  CalendarClock,
  ClipboardList,
  Coins,
  History,
  Hospital,
  HelpCircle,
  Home,
  Info,
  ListChecks,
  Scissors,
  MessageSquare,
  Star,
  Stethoscope,
  User,
  Users,
} from "lucide-react-native";
import React from "react";
import { Platform } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { AppSidebarDrawer } from "@/components/nav/AppSidebarDrawer";
import { AppSidebarProvider } from "@/contexts/AppSidebarContext";
import { useAuthStore } from "@/domains/auth/store";
import { isSignedIn } from "@/domains/auth/session";
import { NATIVE_TAB_BAR_HEIGHT } from "@/constants/webLayout";
import { useColors } from "@/hooks/useColors";
import { useI18n } from "@/hooks/useI18n";

export default function TabsLayout() {
  const colors = useColors();
  const insets = useSafeAreaInsets();
  const { t } = useI18n();
  const profile = useAuthStore((s) => s.profile);
  const accessToken = useAuthStore((s) => s.accessToken);
  const role = useAuthStore((s) => s.role);
  const hydrated = useAuthStore((s) => s.hydrated);
  const signedIn = isSignedIn(profile, accessToken);
  const isDoctor = role?.toLowerCase() === "doctor";

  if (!hydrated) return null;

  // Guests may browse home + our doctors; other tabs stay signed-in only.
  const authOnlyHref = signedIn ? undefined : null;
  // About us is a marketing page — drop it from the tabs once signed in.
  const guestOnlyHref = signedIn ? null : undefined;

  // The bottom bar holds five tabs at most; everything else stays reachable
  // from the drawer. Patients: Home / Appointments / Messages / Records /
  // Profile. Doctors swap Records for Patients.
  const patientTabHref = signedIn && !isDoctor ? undefined : null;
  const doctorTabHref = signedIn && isDoctor ? undefined : null;
  const shortTabLabels = Platform.OS !== "web";

  return (
    <AppSidebarProvider>
      <Tabs
        screenOptions={{
          headerShown: false,
          freezeOnBlur: true,
          lazy: true,
          tabBarActiveTintColor: colors.primary,
          tabBarInactiveTintColor: colors.mutedForeground,
          tabBarLabelStyle: { fontSize: 11, fontWeight: "600" },
          tabBarStyle: {
            backgroundColor: colors.card,
            borderTopColor: colors.border,
            height: NATIVE_TAB_BAR_HEIGHT + insets.bottom,
            paddingBottom: Math.max(insets.bottom, 6),
            paddingTop: 6,
          },
        }}
      >
        <Tabs.Screen
          name="index"
          options={{
            title: t.tabs.home,
            tabBarIcon: ({ color, size }) => <Home color={color} size={size} />,
          }}
        />
        <Tabs.Screen
          name="about-us"
          options={{
            title: t.tabs.aboutUs,
            href: guestOnlyHref,
            tabBarIcon: ({ color, size }) => (
              <Info color={color} size={size} />
            ),
          }}
        />
        <Tabs.Screen
          name="for-doctors"
          options={{
            title: t.tabs.forDoctors,
            href: guestOnlyHref,
            tabBarIcon: ({ color, size }) => (
              <Stethoscope color={color} size={size} />
            ),
          }}
        />
        <Tabs.Screen
          name="faq"
          options={{
            title: t.tabs.faq,
            href: guestOnlyHref,
            tabBarIcon: ({ color, size }) => (
              <HelpCircle color={color} size={size} />
            ),
          }}
        />
        <Tabs.Screen
          name="documentation"
          options={{
            title: t.tabs.documentation,
            // Drawer only on native — never a bottom-tab destination.
            href: null,
          }}
        />
        <Tabs.Screen
          name="pricing"
          options={{
            title: t.tabs.pricing,
            href: null,
            tabBarIcon: ({ color, size }) => <Coins color={color} size={size} />,
          }}
        />
        <Tabs.Screen
          name="notifications"
          options={{
            title: t.tabs.notifications,
            href: null,
            tabBarIcon: ({ color, size }) => <Bell color={color} size={size} />,
          }}
        />
        <Tabs.Screen
          name="assistant"
          options={{
            title: t.tabs.assistant,
            tabBarIcon: ({ color, size }) => <Bot color={color} size={size} />,
            href: null,
            // Full-height chat — composer sits on the home indicator, not above the tab bar.
            tabBarStyle: { display: "none" },
          }}
        />
        <Tabs.Screen
          name="activity"
          options={{
            title: t.tabs.activity,
            href: null,
          }}
        />
        <Tabs.Screen
          name="appointments"
          options={{
            title: t.tabs.appointments,
            tabBarLabel: shortTabLabels ? t.tabs.tabBarSchedule : t.tabs.appointments,
            href: authOnlyHref,
            tabBarIcon: ({ color, size }) => (
              <CalendarClock color={color} size={size} />
            ),
          }}
        />
        <Tabs.Screen
          name="consultations"
          options={{
            title: t.tabs.consultations,
            href: null,
            tabBarIcon: ({ color, size }) => (
              <MessageSquare color={color} size={size} />
            ),
          }}
        />
        <Tabs.Screen
          name="reservations"
          options={{
            title: t.tabs.reservations,
            // Bottom bar is capped at five tabs; patients reach it from the drawer.
            href: null,
            tabBarIcon: ({ color, size }) => <Hospital color={color} size={size} />,
          }}
        />
        <Tabs.Screen
          name="hospitals"
          options={{
            title: t.tabs.hospitals,
            // Doctor bottom bar is full; reached from the drawer.
            href: null,
            tabBarIcon: ({ color, size }) => <Hospital color={color} size={size} />,
          }}
        />
        <Tabs.Screen
          name="surgeries"
          options={{
            title: t.tabs.surgeries,
            // Doctor bottom bar is full; reached from the drawer.
            href: null,
            tabBarIcon: ({ color, size }) => <Scissors color={color} size={size} />,
          }}
        />
        <Tabs.Screen
          name="history"
          options={{
            title: t.tabs.history,
            tabBarLabel: shortTabLabels ? t.tabs.tabBarChats : t.tabs.history,
            href: authOnlyHref,
            tabBarIcon: ({ color, size }) => <History color={color} size={size} />,
          }}
        />
        <Tabs.Screen
          name="records"
          options={{
            title: t.tabs.records,
            href: patientTabHref,
            tabBarIcon: ({ color, size }) => (
              <ClipboardList color={color} size={size} />
            ),
          }}
        />
        <Tabs.Screen
          name="patients"
          options={{
            title: t.tabs.patients,
            href: doctorTabHref,
            tabBarIcon: ({ color, size }) => <Users color={color} size={size} />,
          }}
        />
        <Tabs.Screen
          name="reviews"
          options={{
            title: t.tabs.reviews,
            href: null,
            tabBarIcon: ({ color, size }) => <Star color={color} size={size} />,
          }}
        />
        <Tabs.Screen
          name="intake"
          options={{
            title: t.tabs.intake,
            href: null,
            tabBarIcon: ({ color, size }) => <ListChecks color={color} size={size} />,
          }}
        />
        <Tabs.Screen
          name="points"
          options={{
            title: t.tabs.points,
            href: null,
            tabBarIcon: ({ color, size }) => <Coins color={color} size={size} />,
          }}
        />
        <Tabs.Screen
          name="profile"
          options={{
            title: t.tabs.profile,
            href: authOnlyHref,
            tabBarIcon: ({ color, size }) => <User color={color} size={size} />,
          }}
        />
      </Tabs>
      <AppSidebarDrawer />
    </AppSidebarProvider>
  );
}
