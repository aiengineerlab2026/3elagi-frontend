import { router, useLocalSearchParams } from "expo-router";
import { AppBackButton } from "@/components/nav/AppBackButton";
import { DoctorProfileBody } from "@/components/doctor/DoctorProfileBody";
import { DoctorProfileConsultCta } from "@/components/doctor/DoctorProfileConsultCta";
import { DoctorProfileHeader } from "@/components/doctor/DoctorProfileHeader";
import React, { useCallback, useEffect, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  StyleSheet,
  Text,
  View,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { KeyboardSafeScrollView } from "@/components/KeyboardSafeScrollView";
import { chatRepository } from "@/domains/chat/repository";
import { promptAuthForConsultation } from "@/domains/auth/guestBrowse";
import { useAuthStore } from "@/domains/auth/store";
import { isSignedIn } from "@/domains/auth/session";
import { specialityLabel } from "@/domains/home/specialityLabel";
import {
  fetchDoctorReviewStatus,
  fetchDoctorReviews,
  fetchPublicDoctor,
  submitDoctorReview,
  type DoctorReviewStatus,
  type PublicDoctorProfile,
} from "@/domains/doctor/api";
import { useColors } from "@/hooks/useColors";
import { useI18n } from "@/hooks/useI18n";
import { useWebLayout } from "@/hooks/useWebLayout";
import { flexRow } from "@/utils/rtl";

export default function DoctorProfileScreen() {
  const colors = useColors();
  const { isRTL, locale } = useI18n();
  const { isMobile } = useWebLayout();
  const insets = useSafeAreaInsets();
  const dir = flexRow(isRTL);
  const profile = useAuthStore((s) => s.profile);
  const accessToken = useAuthStore((s) => s.accessToken);
  const role = useAuthStore((s) => s.role);
  const { doctorId, userId } = useLocalSearchParams<{ doctorId: string; userId?: string }>();

  const [doctor, setDoctor] = useState<PublicDoctorProfile | null>(null);
  const [reviews, setReviews] = useState<Awaited<ReturnType<typeof fetchDoctorReviews>>["items"]>([]);
  const [ratingAvg, setRatingAvg] = useState(0);
  const [ratingTotal, setRatingTotal] = useState(0);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [reviewRating, setReviewRating] = useState(5);
  const [reviewComment, setReviewComment] = useState("");
  const [reviewStatus, setReviewStatus] = useState<DoctorReviewStatus | null>(null);

  const isPatient = role?.toLowerCase() === "patient";

  const load = useCallback(async () => {
    if (!doctorId) return;
    setLoading(true);
    try {
      const [doc, rev, status] = await Promise.all([
        fetchPublicDoctor(doctorId),
        fetchDoctorReviews(doctorId),
        isPatient && accessToken
          ? fetchDoctorReviewStatus(doctorId, accessToken)
          : Promise.resolve(null),
      ]);
      setDoctor(doc);
      setReviews(rev.items);
      setRatingAvg(rev.average);
      setRatingTotal(rev.total);
      setReviewStatus(status);
      if (status?.existingReview) {
        setReviewRating(status.existingReview.rating);
        setReviewComment(status.existingReview.comment ?? "");
      }
    } catch (e) {
      Alert.alert(isRTL ? "خطأ" : "Error", (e as Error).message);
    } finally {
      setLoading(false);
    }
  }, [doctorId, isRTL, isPatient, accessToken]);

  useEffect(() => {
    void load();
  }, [load]);

  const openChat = () => {
    const chatUserId = userId ?? doctor?.userId;
    if (!isSignedIn(profile, accessToken)) {
      promptAuthForConsultation(chatUserId ? `/chat/${chatUserId}` : null);
      return;
    }
    if (!chatUserId || !doctor) return;
    chatRepository.cacheUsers([
      {
        id: chatUserId,
        name: doctor.name,
        photoUrl: doctor.photoUrl,
        presence: "offline",
        role: "doctor",
        specialty: doctor.specialty ?? doctor.professionalTitle ?? undefined,
        rating: doctor.ratingAverage,
        ratingTotal: doctor.ratingTotal,
        consultationPrice: doctor.consultationPrice,
        doctorEntityId: doctor.id,
        country: chatRepository.getUser(chatUserId)?.country,
        immediateCallEnabled: chatRepository.getUser(chatUserId)?.immediateCallEnabled,
        onCall: chatRepository.getUser(chatUserId)?.onCall,
      },
    ]);
    router.push(`/chat/${chatUserId}`);
  };

  const submitReview = async () => {
    if (!accessToken || !doctorId || !isPatient) return;
    setSubmitting(true);
    try {
      await submitDoctorReview(doctorId, accessToken, {
        rating: reviewRating,
        comment: reviewComment.trim() || undefined,
      });
      setReviewComment("");
      await load();
      Alert.alert(isRTL ? "شكرًا" : "Thank you", isRTL ? "تم إرسال تقييمك." : "Your review was submitted.");
    } catch (e) {
      Alert.alert(isRTL ? "تعذر الإرسال" : "Could not submit", (e as Error).message);
    } finally {
      setSubmitting(false);
    }
  };

  if (loading || !doctor) {
    return (
      <View style={[styles.center, { backgroundColor: colors.background, paddingTop: insets.top }]}>
        <ActivityIndicator color={colors.primary} />
      </View>
    );
  }

  const specialtyLabelText = specialityLabel(
    {
      nameEn: doctor.specialty ?? doctor.professionalTitle ?? "",
      nameAr: doctor.specialtyAr,
    },
    locale,
  );

  return (
    <View style={{ flex: 1, backgroundColor: colors.background }}>
      <View style={[styles.header, { paddingTop: insets.top + 8, borderBottomColor: colors.border, flexDirection: dir }]}>
        <AppBackButton
          color={colors.primary}
          hitSlop={12}
          fallback="/(tabs)"
          accessibilityLabel={isRTL ? "رجوع" : "Back"}
        />
        <Text style={[styles.headerTitle, { color: colors.foreground, flex: 1 }]} numberOfLines={1}>
          {doctor.name}
        </Text>
      </View>

      <KeyboardSafeScrollView
        contentContainerStyle={[
          styles.content,
          isMobile && styles.contentMobile,
          { paddingBottom: insets.bottom + (isMobile ? 20 : 24) },
        ]}
      >
        <DoctorProfileHeader
          doctor={doctor}
          userId={userId}
          specialtyLabel={specialtyLabelText}
          ratingAvg={ratingAvg}
          ratingTotal={ratingTotal}
          action={
            <DoctorProfileConsultCta
              signedIn={isSignedIn(profile, accessToken)}
              onPress={openChat}
            />
          }
        />

        <DoctorProfileBody
          doctor={doctor}
          specialtyLabel={specialtyLabelText}
          reviews={reviews}
          reviewTotal={ratingTotal}
          reviewStatus={reviewStatus}
          isPatient={isPatient}
          reviewRating={reviewRating}
          onReviewRatingChange={setReviewRating}
          reviewComment={reviewComment}
          onReviewCommentChange={setReviewComment}
          submitting={submitting}
          onSubmitReview={() => void submitReview()}
        />
      </KeyboardSafeScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  center: { flex: 1, alignItems: "center", justifyContent: "center" },
  header: {
    alignItems: "center",
    gap: 10,
    paddingHorizontal: 16,
    paddingBottom: 12,
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
  headerTitle: { fontSize: 17, fontWeight: "800", flexShrink: 1 },
  content: { padding: 14, gap: 14 },
  contentMobile: { padding: 12, gap: 12 },
});
