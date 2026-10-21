import { Stack } from "expo-router";
import { ThemeBootstrap } from "@/components/ThemeBootstrap";
import React, { useCallback, useEffect, useState } from "react";
import { StyleSheet, View } from "react-native";
import { SafeAreaProvider } from "react-native-safe-area-context";
import { KeyboardProvider } from "react-native-keyboard-controller";
import { AppSplash } from "@/components/SplashScreen";
import { DoctorTourBootstrap } from "@/components/onboarding/DoctorTourBootstrap";
import { Ask3elagiAiWidget } from "@/components/assistant/Ask3elagiAiWidget";
import { AppToast } from "@/components/AppToast";
import { MobileAppDownloadHost } from "@/components/web/MobileAppDownloadHost";
import { CookieConsentHost } from "@/components/web/CookieConsentHost";
import { WebClarityBootstrap } from "@/components/web/WebClarityBootstrap.web";
import { AuthRedirect } from "@/components/AuthRedirect";
import { GuestAuthRequiredDialog } from "@/components/auth/GuestAuthRequiredDialog";
import { SessionTransferBootstrap } from "@/components/auth/SessionTransferBootstrap";
import { WebLogoutRedirect } from "@/components/auth/WebLogoutRedirect";
import { LocaleBootstrap } from "@/components/LocaleBootstrap";
import { GlobalWebStyles } from "@/components/web/GlobalWebStyles";
import { DemoEmbedViewport } from "@/components/web/DemoEmbedViewport";
import { NativeWebViewAuthBridge } from "@/components/web/NativeWebViewAuthBridge.web";
import { NativeWebViewPushNavigation } from "@/components/web/NativeWebViewPushNavigation.web";
import { AppointmentNotifications } from "@/components/AppointmentNotifications";
import { AppointmentSync } from "@/components/AppointmentSync";
import { IntakeExamNotifications } from "@/components/IntakeExamNotifications";
import { IntakeExamSync } from "@/components/IntakeExamSync";
import { ChatMessageSync } from "@/components/ChatMessageSync";
import { ChatNotifications } from "@/components/ChatNotifications";
import { DocumentRequestAlert } from "@/components/medical/DocumentRequestAlert";
import { HardwareBackHandler } from "@/components/HardwareBackHandler";
import { IncomingVideoCallOverlay } from "@/components/IncomingVideoCallOverlay";
import { SystemNotifications } from "@/components/SystemNotifications";
import { SystemNotificationSync } from "@/components/SystemNotificationSync";
import { WebChatNotificationsBootstrap } from "@/components/WebChatNotificationsBootstrap";
import { PresenceChatSync } from "@/components/PresenceChatSync";
import { NotificationsInboxBootstrap } from "@/components/NotificationsInboxBootstrap";
import { PresenceSocket } from "@/components/PresenceSocket";
import { useAuthStore } from "@/domains/auth/store";
import { fetchAllMedicalHistory } from "@/domains/medical/api";
import { useMedicalStore } from "@/domains/medical/store";
import { usePointsStore } from "@/domains/points/store";
import { useColors } from "@/hooks/useColors";
import { ErrorBoundary } from "@/components/AppErrorBoundary";
import { GlobalClientErrorHandler } from "@/components/GlobalClientErrorHandler";

export { ErrorBoundary };

function MedicalDataLoader() {
  const hydrated = useAuthStore((s) => s.hydrated);
  const profile = useAuthStore((s) => s.profile);
  const accessToken = useAuthStore((s) => s.accessToken);
  const role = useAuthStore((s) => s.role);
  const setRecordsFromApi = useMedicalStore((s) => s.setRecordsFromApi);
  const clear = useMedicalStore((s) => s.clear);

  const isPatient = role?.toLowerCase() === "patient";

  useEffect(() => {
    if (!hydrated) return;

    if (!profile || !accessToken || !isPatient) {
      clear();
      return;
    }

    let cancelled = false;

    fetchAllMedicalHistory(profile.id, accessToken, role ?? undefined)
      .then((apiRecords) => {
        if (!cancelled) setRecordsFromApi(apiRecords, profile.id);
      })
      .catch(() => {
        if (!cancelled) setRecordsFromApi([], profile.id);
      });

    return () => {
      cancelled = true;
    };
  }, [hydrated, profile?.id, accessToken, isPatient, role, setRecordsFromApi, clear]);

  return null;
}

function PointsDataLoader() {
  const hydrated = useAuthStore((s) => s.hydrated);
  const accessToken = useAuthStore((s) => s.accessToken);
  const role = useAuthStore((s) => s.role);
  const loadPoints = usePointsStore((s) => s.loadPoints);
  const clear = usePointsStore((s) => s.clear);

  const canUsePoints =
    role?.toLowerCase() === "patient" || role?.toLowerCase() === "doctor";

  useEffect(() => {
    if (!hydrated) return;
    if (!accessToken || !canUsePoints) {
      clear();
      return;
    }
    void loadPoints(accessToken);
  }, [hydrated, accessToken, canUsePoints, loadPoints, clear]);

  return null;
}

export default function RootLayout() {
  const colors = useColors();
  const [showSplash, setShowSplash] = useState(true);
  const handleSplashDone = useCallback(() => setShowSplash(false), []);

  if (showSplash) {
    return (
      <GlobalClientErrorHandler>
        <AppSplash onDone={handleSplashDone} />
      </GlobalClientErrorHandler>
    );
  }

  return (
    <GlobalClientErrorHandler>
    <SafeAreaProvider>
      <KeyboardProvider>
        <View style={[styles.root, { backgroundColor: colors.background }]}>
          <ThemeBootstrap />
          <GlobalWebStyles />
          <DemoEmbedViewport />
          <LocaleBootstrap />
          <MedicalDataLoader />
          <PointsDataLoader />
          <NativeWebViewAuthBridge />
          <NativeWebViewPushNavigation />
          <PresenceSocket />
          <NotificationsInboxBootstrap />
          <PresenceChatSync />
          <ChatMessageSync />
          <AppointmentSync />
          <IntakeExamSync />
          <SystemNotificationSync />
          <ChatNotifications />
          <DocumentRequestAlert />
          <AppointmentNotifications />
          <IntakeExamNotifications />
          <SystemNotifications />
          <IncomingVideoCallOverlay />
          <WebChatNotificationsBootstrap />
          <HardwareBackHandler />
          <SessionTransferBootstrap />
          <AuthRedirect />
          <WebLogoutRedirect />
          <Stack screenOptions={{ headerShown: false }}>
            <Stack.Screen name="index" />
            <Stack.Screen name="welcome" />
            <Stack.Screen name="demo" />
            <Stack.Screen name="(tabs)" />
            <Stack.Screen name="auth/login" options={{ presentation: "modal" }} />
            <Stack.Screen name="auth/signup" options={{ presentation: "modal" }} />
            <Stack.Screen name="auth/verify-email" options={{ presentation: "modal" }} />
            <Stack.Screen name="auth/forgot-password" options={{ presentation: "modal" }} />
            <Stack.Screen name="auth/reset-password" options={{ presentation: "modal" }} />
            <Stack.Screen name="auth/choose-country" options={{ presentation: "modal" }} />
            <Stack.Screen name="contact" />
            <Stack.Screen name="register-with-us" />
            <Stack.Screen name="rate-us" />
            <Stack.Screen name="chat/[id]" />
            <Stack.Screen name="video-call" />
            <Stack.Screen name="ai/[id]" />
            <Stack.Screen name="doctor/[doctorId]" />
            <Stack.Screen name="patients/[userId]" />
            <Stack.Screen name="medical/add" options={{ presentation: "modal" }} />
            <Stack.Screen name="medical/add-method" options={{ presentation: "modal" }} />
            <Stack.Screen name="medical/add-ai" options={{ presentation: "modal" }} />
            <Stack.Screen name="medical/prescription/add" />
            <Stack.Screen name="medical/[id]" />
            <Stack.Screen name="medical/request/[id]" />
            <Stack.Screen name="admin/index" />
            <Stack.Screen name="admin/analytics" />
            <Stack.Screen name="admin/app-reviews" />
            <Stack.Screen name="admin/chats" />
            <Stack.Screen name="admin/complaints" />
            <Stack.Screen name="admin/contact-messages" />
            <Stack.Screen name="admin/deleted-accounts" />
            <Stack.Screen name="admin/doctor-registrations" />
            <Stack.Screen name="admin/doctor-signup" />
            <Stack.Screen name="admin/doctor-speciality-changes" />
            <Stack.Screen name="admin/doctor-welcome-email" />
            <Stack.Screen name="admin/whatsapp" />
            <Stack.Screen name="admin/marketing" />
            <Stack.Screen name="admin/pricing" />
            <Stack.Screen name="admin/rag" />
            <Stack.Screen name="admin/specialities" />
            <Stack.Screen name="doctor-pending" />
            <Stack.Screen name="points/checkout" />
          </Stack>
          <AppToast />
          <WebClarityBootstrap />
          <CookieConsentHost />
          <MobileAppDownloadHost />
          <Ask3elagiAiWidget />
          <DoctorTourBootstrap />
          <GuestAuthRequiredDialog />
        </View>
      </KeyboardProvider>
    </SafeAreaProvider>
    </GlobalClientErrorHandler>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
    width: "100%",
    minHeight: "100%",
  },
});
