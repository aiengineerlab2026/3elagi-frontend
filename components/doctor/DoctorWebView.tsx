import { useLocalSearchParams, usePathname, useRouter } from "expo-router";
import { ArrowLeft, ArrowRight } from "lucide-react-native";
import React, { useCallback, useEffect, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from "react-native";
import { DoctorProfileBody } from "@/components/doctor/DoctorProfileBody";
import { DoctorProfileConsultCta } from "@/components/doctor/DoctorProfileConsultCta";
import { DoctorProfileHeader } from "@/components/doctor/DoctorProfileHeader";
import { WEB_MAX_WIDTH } from "@/constants/webLayout";
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
  type DoctorReviewItem,
  type DoctorReviewStatus,
  type PublicDoctorProfile,
} from "@/domains/doctor/api";
import { useColors } from "@/hooks/useColors";
import { useI18n } from "@/hooks/useI18n";
import { useWebLayout } from "@/hooks/useWebLayout";
import { canNavigateBack, navigateBack } from "@/utils/appNavigation";

export function DoctorWebView() {
  const colors = useColors();
  const { isRTL, locale } = useI18n();
  const { isDesktop } = useWebLayout();
  const router = useRouter();
  usePathname();
  const dir = isRTL ? "row-reverse" : "row";
  const showBack = canNavigateBack(router);

  const profile = useAuthStore((s) => s.profile);
  const accessToken = useAuthStore((s) => s.accessToken);
  const role = useAuthStore((s) => s.role);
  const { doctorId, userId } = useLocalSearchParams<{ doctorId: string; userId?: string }>();

  const [doctor, setDoctor] = useState<PublicDoctorProfile | null>(null);
  const [reviews, setReviews] = useState<DoctorReviewItem[]>([]);
  const [ratingAvg, setRatingAvg] = useState(0);
  const [ratingTotal, setRatingTotal] = useState(0);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [reviewRating, setReviewRating] = useState(5);
  const [reviewComment, setReviewComment] = useState("");
  const [reviewStatus, setReviewStatus] = useState<DoctorReviewStatus | null>(null);

  const isPatient = role?.toLowerCase() === "patient";
  const reviewColumns = isDesktop ? 2 : 1;

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
      <View style={[styles.page, { backgroundColor: colors.background }]}>
        <ActivityIndicator style={{ marginTop: 80 }} color={colors.primary} />
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
    <View style={[styles.page, { backgroundColor: colors.background }]}>
      <ScrollView
        style={styles.scroll}
        contentContainerStyle={[styles.scrollContent, isDesktop && styles.scrollContentDesktop]}
        keyboardShouldPersistTaps="handled"
      >
        <View style={[styles.container, { maxWidth: WEB_MAX_WIDTH.content }]}>
          {showBack ? (
            <Pressable
              onPress={() => navigateBack(router)}
              style={[
                styles.backBtn,
                {
                  flexDirection: dir,
                  alignSelf: isRTL ? "flex-end" : "flex-start",
                },
              ]}
            >
              {isRTL ? (
                <ArrowRight size={18} color={colors.primary} />
              ) : (
                <ArrowLeft size={18} color={colors.primary} />
              )}
              <Text style={[styles.backText, { color: colors.primary }]}>
                {isRTL ? "رجوع" : "Back"}
              </Text>
            </Pressable>
          ) : null}

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
            reviewColumns={reviewColumns}
          />
        </View>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  page: { flex: 1, minHeight: 0, width: "100%" },
  scroll: { flex: 1 },
  scrollContent: {
    flexGrow: 1,
    alignItems: "center",
    paddingHorizontal: 20,
    paddingTop: 16,
    paddingBottom: 40,
  },
  scrollContentDesktop: {
    paddingHorizontal: 32,
    paddingTop: 24,
    paddingBottom: 48,
  },
  container: {
    width: "100%",
    gap: 14,
  },
  backBtn: { alignItems: "center", gap: 8, paddingVertical: 4, alignSelf: "flex-start" },
  backText: { fontSize: 14, fontWeight: "600" },
});
