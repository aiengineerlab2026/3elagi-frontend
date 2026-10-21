import { useRouter } from "expo-router";
import React from "react";
import { ScrollView, StyleSheet } from "react-native";
import { AdminShell } from "@/components/admin/AdminShell";
import { WelcomeSignupForm } from "@/components/auth/WelcomeSignupForm";
import { showSuccessToast } from "@/utils/toast";

export default function AdminDoctorSignupWeb() {
  const router = useRouter();

  return (
    <AdminShell
      title="Add doctor"
      subtitle="Create a doctor account. They are approved immediately. Send login credentials separately from Welcome email."
    >
      <ScrollView contentContainerStyle={styles.content}>
        <WelcomeSignupForm
          adminDoctorMode
          onSwitchToLogin={() => router.push("/admin")}
          onAdminDoctorCreated={() => {
            showSuccessToast("Doctor account created and approved");
            router.push("/admin");
          }}
        />
      </ScrollView>
    </AdminShell>
  );
}

const styles = StyleSheet.create({
  content: {
    padding: 28,
    paddingBottom: 48,
    maxWidth: 960,
    width: "100%",
    alignSelf: "center",
  },
});
