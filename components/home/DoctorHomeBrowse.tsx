import { useFocusEffect } from "@react-navigation/native";
import React, { useCallback, useState } from "react";
import {
  ActivityIndicator,
  Platform,
  RefreshControl,
  ScrollView,
  StyleSheet,
} from "react-native";
import {
  ASK_3ELAGI_AI_FAB_CHROME_GAP,
  ASK_3ELAGI_AI_FAB_SIZE,
} from "@/components/assistant/Ask3elagiAiWidget";
import { DoctorConsultationQueue } from "@/components/home/DoctorConsultationQueue";
import { HomeDoctorHeader } from "@/components/home/HomeDoctorHeader";
import { HomeHeroWithTvVideo } from "@/components/home/HomeHeroWithTvVideo";
import { BRAND_SCROLL_NATIVE_ID } from "@/components/web/globalWebStyles";
import { updateAccountProfile } from "@/domains/auth/profile-api";
import { useAuthStore } from "@/domains/auth/store";
import { canUseChat } from "@/domains/chat/access";
import { useChatStore } from "@/domains/chat/store";
import { useDoctorDashboard } from "@/hooks/useDoctorDashboard";
import { useColors } from "@/hooks/useColors";
import { useI18n } from "@/hooks/useI18n";
import { showErrorToast, showSuccessToast } from "@/utils/toast";

export function DoctorHomeBrowse() {
  const colors = useColors();
  const { t } = useI18n();
  const accessToken = useAuthStore((s) => s.accessToken);
  const role = useAuthStore((s) => s.role);
  const profile = useAuthStore((s) => s.profile);
  const loadConversations = useChatStore((s) => s.loadConversations);
  const {
    metrics,
    consultations,
    account,
    setAccount,
    loading,
    refreshing,
    load,
    refresh,
  } = useDoctorDashboard(accessToken, role);
  const [togglingAvailability, setTogglingAvailability] = useState(false);

  const bootstrap = useCallback(async () => {
    if (accessToken && profile?.id && canUseChat(role)) {
      await loadConversations(accessToken, profile.id, role);
    }
    await load();
  }, [accessToken, profile?.id, role, loadConversations, load]);

  useFocusEffect(
    useCallback(() => {
      void bootstrap();
    }, [bootstrap]),
  );

  const handleToggleAvailability = async (next: boolean) => {
    if (!accessToken || !role || !account) return;
    setTogglingAvailability(true);
    try {
      await updateAccountProfile(accessToken, role, {
        name: account.name,
        phone: account.phone,
        country: account.country,
        birthDate: account.birthDate,
        professionalTitle: account.professionalTitle,
        info: account.info,
        location: account.location,
        certifications: account.certifications,
        specialityId: account.specialityId,
        specialityIds: account.specialityIds,
        consultationPrice: account.consultationPrice,
        videoConsultationPrice: account.videoConsultationPrice,
        videoConsultationMinutes: account.videoConsultationMinutes,
        immediateCallEnabled: next,
        digitalSignatureUrl: account.digitalSignatureUrl ?? null,
        iban: account.iban,
        accountHolderFullName: account.accountHolderFullName,
        nationalId: account.nationalId,
        photoUrl: account.photoUrl ?? null,
      });
      setAccount({ ...account, immediateCallEnabled: next });
      showSuccessToast(
        next ? t.doctorDashboard.availabilityEnabledToast : t.doctorDashboard.availabilityDisabledToast,
      );
    } catch (e) {
      showErrorToast(t.common.error, (e as Error).message);
    } finally {
      setTogglingAvailability(false);
    }
  };

  if (loading && !account) {
    return <ActivityIndicator style={{ marginTop: 40 }} color={colors.primary} />;
  }

  const availabilityProps = {
    immediateCallEnabled: !!account?.immediateCallEnabled,
    togglingAvailability,
    onToggleAvailability: (next: boolean) => void handleToggleAvailability(next),
  };

  return (
    <ScrollView
      nativeID={BRAND_SCROLL_NATIVE_ID}
      style={styles.scroll}
      contentContainerStyle={styles.content}
      showsVerticalScrollIndicator
      refreshControl={
        <RefreshControl refreshing={refreshing} onRefresh={() => void refresh()} tintColor={colors.primary} />
      }
    >
      <HomeHeroWithTvVideo>
        <HomeDoctorHeader besideMedia metrics={metrics} {...availabilityProps} />
      </HomeHeroWithTvVideo>
      <DoctorConsultationQueue consultations={consultations} />
    </ScrollView>
  );
}

const NATIVE_FAB_SCROLL_PAD =
  ASK_3ELAGI_AI_FAB_SIZE + ASK_3ELAGI_AI_FAB_CHROME_GAP + 16;

const styles = StyleSheet.create({
  scroll: { flex: 1 },
  content: {
    paddingBottom: Platform.OS !== "web" ? NATIVE_FAB_SCROLL_PAD : 24,
    gap: 4,
  },
});
