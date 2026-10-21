import { Stack } from "expo-router";
import React, { useCallback, useEffect, useState } from "react";
import { GestureHandlerRootView } from "react-native-gesture-handler";
import { Platform, View } from "react-native";
import { SafeAreaProvider } from "react-native-safe-area-context";
import { KeyboardProvider } from "react-native-keyboard-controller";
import { NotificationsInboxBootstrap } from "@/components/NotificationsInboxBootstrap";
import { PushNotificationsBootstrap } from "@/components/PushNotificationsBootstrap";
import { WebChatNotificationsBootstrap } from "@/components/WebChatNotificationsBootstrap";
import { Ask3elagiAiWidget } from "@/components/assistant/Ask3elagiAiWidget";
import { DoctorTourBootstrap } from "@/components/onboarding/DoctorTourBootstrap";
import { AppToast } from "@/components/AppToast";
import { MobileAppDownloadHost } from "@/components/web/MobileAppDownloadHost";
import { AppointmentNotifications } from "@/components/AppointmentNotifications";
import { AppointmentSync } from "@/components/AppointmentSync";
import { IntakeExamNotifications } from "@/components/IntakeExamNotifications";
import { IntakeExamSync } from "@/components/IntakeExamSync";
import { ChatNotifications } from "@/components/ChatNotifications";
import { DocumentRequestAlert } from "@/components/medical/DocumentRequestAlert";
import { HardwareBackHandler } from "@/components/HardwareBackHandler";
import { IncomingVideoCallOverlay } from "@/components/IncomingVideoCallOverlay";
import { AppSplash } from "@/components/SplashScreen";
import { NavLoadingOverlay } from "@/components/NavLoadingOverlay";
import { SystemNotifications } from "@/components/SystemNotifications";
import { SystemNotificationSync } from "@/components/SystemNotificationSync";
import { ArabicFontBootstrap } from "@/components/ArabicFontBootstrap";
import { ClarityBootstrap } from "@/components/ClarityBootstrap";
import { LocaleBootstrap } from "@/components/LocaleBootstrap";
import { LocaleAuthSync } from "@/components/LocaleAuthSync";
import { AuthRedirect } from "@/components/AuthRedirect";
import { GuestAuthRequiredDialog } from "@/components/auth/GuestAuthRequiredDialog";
import { ChatMessageSync } from "@/components/ChatMessageSync";
import { PresenceChatSync } from "@/components/PresenceChatSync";
import { PresenceSocket } from "@/components/PresenceSocket";
import { ThemeBootstrap } from "@/components/ThemeBootstrap";
import { useAuthStore } from "@/domains/auth/store";
import { fetchAllMedicalHistory } from "@/domains/medical/api";
import { useMedicalStore } from "@/domains/medical/store";
import { usePointsStore } from "@/domains/points/store";
import { useRemindersStore } from "@/domains/reminders/store";
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

function RemindersBootstrap() {
  const init = useRemindersStore((s) => s.init);
  const hydrated = useAuthStore((s) => s.hydrated);

  useEffect(() => {
    if (!hydrated) return;
    void init();
  }, [hydrated, init]);

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

function AppRoot() {
  const colors = useColors();

  return (
    <GestureHandlerRootView style={{ flex: 1, backgroundColor: colors.background }}>
      <SafeAreaProvider>
        <KeyboardProvider statusBarTranslucent navigationBarTranslucent>
          <ThemeBootstrap />
          <MedicalDataLoader />
          <PointsDataLoader />
          <RemindersBootstrap />
          <LocaleBootstrap />
          <ArabicFontBootstrap />
          <LocaleAuthSync />
          <AuthRedirect />
          <View style={{ flex: 1 }}>
            <Stack screenOptions={{ headerShown: false }}>
              <Stack.Screen name="index" />
              <Stack.Screen name="welcome" />
              <Stack.Screen name="(tabs)" />
              <Stack.Screen
                name="auth/login"
                options={{
                  presentation: Platform.OS === "web" ? "modal" : "fullScreenModal",
                }}
              />
              <Stack.Screen
                name="auth/signup"
                options={{
                  presentation: Platform.OS === "web" ? "modal" : "fullScreenModal",
                }}
              />
              <Stack.Screen
                name="auth/verify-email"
                options={{
                  presentation: Platform.OS === "web" ? "modal" : "fullScreenModal",
                }}
              />
              <Stack.Screen
                name="auth/forgot-password"
                options={{
                  presentation: Platform.OS === "web" ? "modal" : "fullScreenModal",
                }}
              />
              <Stack.Screen
                name="auth/reset-password"
                options={{
                  presentation: Platform.OS === "web" ? "modal" : "fullScreenModal",
                }}
              />
              <Stack.Screen
                name="auth/choose-country"
                options={{
                  presentation: Platform.OS === "web" ? "modal" : "fullScreenModal",
                }}
              />
              <Stack.Screen name="auth/callback" />
              <Stack.Screen name="contact" />
              <Stack.Screen name="register-with-us" />
              <Stack.Screen name="rate-us" />
              <Stack.Screen name="doctors" />
              <Stack.Screen name="chat/[id]" />
              <Stack.Screen name="video-call" />
              <Stack.Screen name="ai/[id]" />
              <Stack.Screen name="doctor/[doctorId]" />
              <Stack.Screen name="patients/[userId]" />
              <Stack.Screen name="medical/add" options={{ presentation: "modal" }} />
              <Stack.Screen name="medical/add-method" options={{ presentation: "modal" }} />
              <Stack.Screen name="medical/add-ai" options={{ presentation: "modal" }} />
              <Stack.Screen name="medical/prescription/add" options={{ presentation: "modal" }} />
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
            <NavLoadingOverlay />
            <AppToast />
          <MobileAppDownloadHost />
            <Ask3elagiAiWidget />
            <DoctorTourBootstrap />
            <GuestAuthRequiredDialog />
          </View>
        </KeyboardProvider>
      </SafeAreaProvider>
    </GestureHandlerRootView>
  );
}

export default function RootLayout() {
  const [showSplash, setShowSplash] = useState(true);
  const handleSplashDone = useCallback(() => setShowSplash(false), []);

  return (
    <GlobalClientErrorHandler>
      <ClarityBootstrap />
      <PushNotificationsBootstrap />
      <WebChatNotificationsBootstrap />
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
      <HardwareBackHandler />
      {showSplash ? <AppSplash onDone={handleSplashDone} /> : <AppRoot />}
    </GlobalClientErrorHandler>
  );
}
