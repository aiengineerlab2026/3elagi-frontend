import { Redirect, useRouter } from "expo-router";
import React, { useCallback, useEffect } from "react";
import { Pressable, StyleSheet, Text, View } from "react-native";
import { useAuthStore } from "@/domains/auth/store";
import { isSignedIn } from "@/domains/auth/session";
import { API_BASE } from "@/constants/api";
import { useColors } from "@/hooks/useColors";
import { useI18n } from "@/hooks/useI18n";

async function fetchDoctorApprovalStatus(
  token: string,
): Promise<"pending" | "approved" | "rejected" | null> {
  const res = await fetch(`${API_BASE}/doctors/me`, {
    headers: { Authorization: `Bearer ${token}` },
  });
  if (!res.ok) return null;
  const data = (await res.json()) as { approval_status?: string };
  if (
    data.approval_status === "pending" ||
    data.approval_status === "approved" ||
    data.approval_status === "rejected"
  ) {
    return data.approval_status;
  }
  return null;
}

export default function DoctorPendingScreen() {
  const colors = useColors();
  const { isRTL } = useI18n();
  const router = useRouter();
  const profile = useAuthStore((s) => s.profile);
  const accessToken = useAuthStore((s) => s.accessToken);
  const role = useAuthStore((s) => s.role);
  const doctorApprovalStatus = useAuthStore((s) => s.doctorApprovalStatus);
  const setDoctorApprovalStatus = useAuthStore((s) => s.setDoctorApprovalStatus);
  const logout = useAuthStore((s) => s.logout);

  const checkStatus = useCallback(async () => {
    if (!accessToken) return;
    const status = await fetchDoctorApprovalStatus(accessToken);
    if (!status) return;
    setDoctorApprovalStatus(status);
    if (status === "approved") {
      router.replace("/(tabs)");
    }
  }, [accessToken, router, setDoctorApprovalStatus]);

  useEffect(() => {
    void checkStatus();
    const timer = setInterval(() => void checkStatus(), 15000);
    return () => clearInterval(timer);
  }, [checkStatus]);

  if (!isSignedIn(profile, accessToken)) {
    return <Redirect href="/welcome" />;
  }

  if (role?.toLowerCase() !== "doctor") {
    return <Redirect href="/(tabs)" />;
  }

  if (doctorApprovalStatus === "approved") {
    return <Redirect href="/(tabs)" />;
  }

  const isRejected = doctorApprovalStatus === "rejected";

  return (
    <View style={[styles.root, { backgroundColor: colors.background }]}>
      <View style={[styles.card, { backgroundColor: colors.card, borderColor: colors.border }]}>
        <Text style={[styles.title, { color: colors.foreground }]}>
          {isRejected
            ? isRTL
              ? "تم رفض الطلب"
              : "Application rejected"
            : isRTL
              ? "في انتظار الموافقة"
              : "Pending admin approval"}
        </Text>
        <Text style={[styles.body, { color: colors.mutedForeground }]}>
          {isRejected
            ? isRTL
              ? "تم رفض طلب انضمامك كطبيب. تواصل مع الدعم إذا كنت تعتقد أن هذا خطأ."
              : "Your doctor application was rejected. Contact support if you think this is a mistake."
            : isRTL
              ? "تم استلام طلبك. سيقوم المسؤول بمراجعة بياناتك ووثائقك قبل ظهورك في قائمة الأطباء."
              : "We received your application. An admin will review your details and documents before you appear in the doctor list."}
        </Text>
        <Pressable
          onPress={() => {
            logout();
            router.replace("/welcome");
          }}
          style={[styles.logoutBtn, { borderColor: colors.border }]}
        >
          <Text style={{ color: colors.foreground, fontWeight: "700" }}>
            {isRTL ? "تسجيل الخروج" : "Log out"}
          </Text>
        </Pressable>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    padding: 24,
  },
  card: {
    width: "100%",
    maxWidth: 480,
    borderWidth: 1,
    borderRadius: 16,
    padding: 24,
    gap: 12,
  },
  title: { fontSize: 22, fontWeight: "800", textAlign: "center" },
  body: { fontSize: 15, lineHeight: 22, textAlign: "center" },
  logoutBtn: {
    marginTop: 12,
    borderWidth: 1,
    borderRadius: 12,
    paddingVertical: 12,
    alignItems: "center",
  },
});
