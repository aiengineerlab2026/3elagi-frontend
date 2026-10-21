import { FileText, Plus } from "lucide-react-native";
import { router, useLocalSearchParams } from "expo-router";
import React, { useState } from "react";
import {
  ActivityIndicator,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Switch,
  Text,
  View,
  type ViewStyle,
} from "react-native";
import { AppTextInput } from "@/components/AppTextInput";
import { EgpPriceInput } from "@/components/EgpPriceInput";
import { DoctorAvailabilityEditor } from "@/components/DoctorAvailabilityEditor";
import { SurgeryAvailabilityEditor } from "@/components/profile/SurgeryAvailabilityEditor";
import { DoctorDigitalSignatureField } from "@/components/profile/DoctorDigitalSignatureField";
import { DoctorFeesFields } from "@/components/profile/DoctorFeesFields";
import { DoctorPaymentMethodFields } from "@/components/profile/DoctorPaymentMethodFields";
import { DoctorProfileHeader } from "@/components/profile/DoctorProfileHeader";
import { DoctorSettingsSaveDock } from "@/components/profile/DoctorSettingsSaveDock";
import { DoctorSettingsTabBar } from "@/components/profile/DoctorSettingsTabBar";
import { DoctorTagsInput } from "@/components/profile/DoctorTagsInput";
import { PendingSpecialityChangeBanner } from "@/components/profile/PendingSpecialityChangeBanner";
import { ProfileAiField } from "@/components/profile/ProfileAiField";
import { ProfileChangePasswordField } from "@/components/profile/ProfileChangePasswordField";
import { ProfileCountryField } from "@/components/profile/ProfileCountryField";
import { ProfileLanguageField } from "@/components/profile/ProfileLanguageField";
import { ProfileThemeField } from "@/components/profile/ProfileThemeField";
import {
  certFileName,
  profileFieldGridStyle,
  profileGridSpanFull,
  ProfileSettingsField,
} from "@/components/profile/profileSettingsFields";
import { DOCTOR_SETTINGS_TABS, type DoctorSettingsTabId } from "@/components/profile/doctorSettingsTypes";
import {
  profileSaveChromeHeight,
  profileSaveDockBottomPad,
} from "@/components/profile/profileSaveChrome";
import { SpecialityMultiSelect } from "@/components/profile/SpecialityMultiSelect";
import { normalizeMarketCountry } from "@/constants/patientCountries";
import { PROFILE_SETTINGS } from "@/constants/profileSettingsDesign";
import { WEB_MAX_WIDTH } from "@/constants/webLayout";
import type { useProfileEditor } from "@/hooks/useProfileEditor";
import { useI18n } from "@/hooks/useI18n";
import { useMobileWebPageTitlePaddingTop } from "@/hooks/useMobileWebPageTitlePaddingTop";
import { useProductTourStore } from "@/domains/onboarding/productTourStore";
import { useAuthStore } from "@/domains/auth/store";
import { useWebLayout } from "@/hooks/useWebLayout";
import { useColors } from "@/hooks/useColors";
import { useSafeAreaInsets } from "react-native-safe-area-context";

const VIDEO_DURATIONS = [
  { m: 30, en: "30 min", ar: "٣٠ دقيقة" },
  { m: 60, en: "1 hour", ar: "ساعة" },
  { m: 120, en: "2 hours", ar: "ساعتان" },
];

type EditorState = ReturnType<typeof useProfileEditor>;

type Props = {
  accessToken: string;
  editor: EditorState;
  showLogout?: boolean;
  onLogout?: () => void;
  hideNativeHeader?: boolean;
};

function SettingsCard({
  title,
  children,
  isRTL,
}: {
  title?: string;
  children: React.ReactNode;
  isRTL: boolean;
}) {
  const textAlign = isRTL ? "right" : "left";
  return (
    <View
      style={[
        styles.card,
        { backgroundColor: PROFILE_SETTINGS.bg.card, borderColor: PROFILE_SETTINGS.border },
      ]}
    >
      {title ? (
        <Text style={[styles.cardTitle, { color: PROFILE_SETTINGS.text.primary, textAlign }]}>
          {title}
        </Text>
      ) : null}
      {children}
    </View>
  );
}

export function DoctorSettingsEditor({
  accessToken,
  editor,
  showLogout = false,
  onLogout,
}: Props) {
  const colors = useColors();
  const { t, isRTL, locale } = useI18n();
  const { isDesktop, isTablet } = useWebLayout();
  const mobileTitlePaddingTop = useMobileWebPageTitlePaddingTop();
  const insets = useSafeAreaInsets();
  const advanceOnAnchorTap = useProductTourStore((s) => s.advanceOnAnchorTap);
  const doctorApprovalStatus = useAuthStore((s) => s.doctorApprovalStatus);
  // ?tab=surgery deep-links a subtab (e.g. "Propose new slots" from the Hospitals tab).
  const { tab: tabParam } = useLocalSearchParams<{ tab?: string }>();
  const [activeTab, setActiveTab] = useState<DoctorSettingsTabId>(
    DOCTOR_SETTINGS_TABS.find((x) => x.id === tabParam)?.id ?? "personal",
  );

  const {
    loading,
    saving,
    account,
    name,
    setName,
    phone,
    setPhone,
    country,
    setCountry,
    professionalTitle,
    setProfessionalTitle,
    info,
    setInfo,
    location,
    setLocation,
    certifications,
    certUploading,
    addCertification,
    removeCertification,
    setCertificationDescription,
    specialities,
    specialityIds,
    toggleSpeciality,
    consultationPrice,
    setConsultationPrice,
    videoConsultationPrice,
    setVideoConsultationPrice,
    videoConsultationMinutes,
    immediateCallEnabled,
    setImmediateCallEnabled,
    setVideoConsultationMinutes,
    digitalSignaturePreview,
    signatureUploading,
    pickDigitalSignature,
    clearDigitalSignature,
    iban,
    setIban,
    accountHolderFullName,
    setAccountHolderFullName,
    nationalId,
    setNationalId,
    textPriceLocal,
    setTextPriceLocal,
    textPriceUsd,
    setTextPriceUsd,
    videoPriceLocal,
    setVideoPriceLocal,
    videoPriceUsd,
    setVideoPriceUsd,
    paymentLink,
    setPaymentLink,
    patientPaymentMethod,
    setPatientPaymentMethod,
    tags,
    setTags,
    displayPhoto,
    pickPhoto,
    save,
    pendingSpecialityChange,
  } = editor;

  const textAlign = isRTL ? "right" : "left";
  const dir = isRTL ? "row-reverse" : "row";
  const desktopSplit = isDesktop;
  const fields2 = profileFieldGridStyle(desktopSplit, 2);
  const spanFull = profileGridSpanFull(desktopSplit);
  const saveChromeHeight = profileSaveChromeHeight({ withLogout: showLogout });
  const dockPadBottom = profileSaveDockBottomPad(insets.bottom);
  const fabClearance = Platform.OS === "web" && isTablet ? 0 : 88;
  const isVerified =
    doctorApprovalStatus === "approved" ||
    Boolean(digitalSignaturePreview && specialityIds.length > 0);

  const handleSave = () => {
    advanceOnAnchorTap("profile-save");
    void save();
  };

  if (loading) {
    return (
      <View style={[styles.page, { backgroundColor: PROFILE_SETTINGS.bg.app }]}>
        <ActivityIndicator style={{ marginTop: 80 }} color={PROFILE_SETTINGS.brand} />
      </View>
    );
  }

  const personalTab = (
    <View style={styles.tabContent}>
      <SettingsCard title={t.settings.personalInfo} isRTL={isRTL}>
        <View style={fields2}>
          <ProfileSettingsField
            label={isRTL ? "الاسم" : "Name"}
            value={name}
            onChangeText={setName}
            colors={colors}
            isRTL={isRTL}
          />
          <ProfileSettingsField
            label={isRTL ? "الهاتف" : "Phone"}
            value={phone}
            onChangeText={setPhone}
            keyboardType="phone-pad"
            colors={colors}
            isRTL={isRTL}
          />
          <View style={spanFull}>
            <ProfileSettingsField
              label={isRTL ? "البريد الإلكتروني" : "Email"}
              value={account?.email ?? ""}
              editable={false}
              colors={colors}
              isRTL={isRTL}
            />
          </View>
          <View style={spanFull}>
            <ProfileCountryField
              value={normalizeMarketCountry(country)}
              onChange={setCountry}
              disabled={saving}
              isRTL={isRTL}
            />
          </View>
        </View>
      </SettingsCard>

      <SettingsCard title={t.settings.changePassword} isRTL={isRTL}>
        <ProfileChangePasswordField accessToken={accessToken} />
      </SettingsCard>

      <SettingsCard title={t.settings.preferences} isRTL={isRTL}>
        <View style={fields2}>
          <ProfileLanguageField embedded wideCards />
          <ProfileThemeField />
          <View style={spanFull}>
            <ProfileAiField />
          </View>
        </View>
      </SettingsCard>
    </View>
  );

  const practiceTab = (
    <View style={styles.tabContent}>
      <SettingsCard title={isRTL ? "البيانات المهنية" : "Professional details"} isRTL={isRTL}>
        <View style={fields2}>
          <ProfileSettingsField
            label={isRTL ? "المسمى الوظيفي" : "Professional title"}
            value={professionalTitle}
            onChangeText={setProfessionalTitle}
            colors={colors}
            isRTL={isRTL}
          />
          <View style={spanFull}>
            <Text style={[styles.sectionLabel, { color: PROFILE_SETTINGS.text.section, textAlign }]}>
              {t.settings.personalClinicLocation}
            </Text>
            <Text style={[styles.hint, { color: PROFILE_SETTINGS.text.secondary, textAlign }]}>
              {t.settings.googleMapsLocationHint}
            </Text>
            <ProfileSettingsField
              label=""
              value={location}
              onChangeText={setLocation}
              placeholder={t.settings.googleMapsLocationPlaceholder}
              autoCapitalize="none"
              multiline
              colors={colors}
              isRTL={isRTL}
            />
          </View>
        </View>
      </SettingsCard>

      <SettingsCard title={isRTL ? "التخصص والسيرة" : "Speciality & biography"} isRTL={isRTL}>
        <View style={styles.stack}>
          <ProfileSettingsField
            label={isRTL ? "نبذة عن الطبيب" : "Biography"}
            value={info}
            onChangeText={setInfo}
            placeholder={isRTL ? "خبرات، اهتمامات طبية..." : "Experience, focus areas..."}
            multiline
            colors={colors}
            isRTL={isRTL}
          />
          <View>
            <Text style={[styles.sectionLabel, { color: PROFILE_SETTINGS.text.section, textAlign }]}>
              {isRTL ? "التخصصات" : "Specialities"}
            </Text>
            {pendingSpecialityChange ? (
              <PendingSpecialityChangeBanner
                pending={pendingSpecialityChange}
                isRTL={isRTL}
                colors={colors}
              />
            ) : null}
            <SpecialityMultiSelect
              specialities={specialities}
              selectedIds={specialityIds}
              onToggle={toggleSpeciality}
              isRTL={isRTL}
              locale={locale}
              colors={colors}
            />
          </View>
          <View>
            <Text style={[styles.sectionLabel, { color: PROFILE_SETTINGS.text.section, textAlign }]}>
              {t.settings.doctorTags}
            </Text>
            <DoctorTagsInput
              tags={tags}
              onChange={setTags}
              primarySpecialityId={specialityIds[0] ?? ""}
              isRTL={isRTL}
              colors={colors}
              disabled={saving}
            />
          </View>
        </View>
      </SettingsCard>
    </View>
  );

  const pricingTab = (
    <View style={styles.tabContent}>
      <SettingsCard title={isRTL ? "أسعار الاستشارة" : "Consultation rates"} isRTL={isRTL}>
        <DoctorFeesFields
          country={country}
          textLocal={textPriceLocal}
          onTextLocal={setTextPriceLocal}
          textUsd={textPriceUsd}
          onTextUsd={setTextPriceUsd}
          videoLocal={videoPriceLocal}
          onVideoLocal={setVideoPriceLocal}
          videoUsd={videoPriceUsd}
          onVideoUsd={setVideoPriceUsd}
          disabled={saving}
          layout="comparative"
        />
      </SettingsCard>

      <SettingsCard title={isRTL ? "طريقة استلام الدفع" : "Patient payment"} isRTL={isRTL}>
        <DoctorPaymentMethodFields
          method={patientPaymentMethod}
          onMethodChange={setPatientPaymentMethod}
          paymentLink={paymentLink}
          onPaymentLinkChange={setPaymentLink}
          iban={iban}
          onIbanChange={setIban}
          accountHolderFullName={accountHolderFullName}
          onAccountHolderFullNameChange={setAccountHolderFullName}
          nationalId={nationalId}
          onNationalIdChange={setNationalId}
          disabled={saving}
        />
      </SettingsCard>
    </View>
  );

  const availabilityTab = (
    <View style={styles.tabContent}>
      <SettingsCard title={isRTL ? "الجدول الأسبوعي" : "Weekly schedule"} isRTL={isRTL}>
        {accessToken ? (
          <DoctorAvailabilityEditor isRTL={isRTL} token={accessToken} embedded variant="weekly" />
        ) : null}
      </SettingsCard>

      <SettingsCard title={isRTL ? "إعدادات الاستشارة" : "Consultation settings"} isRTL={isRTL}>
        <View style={styles.stack}>
          <Text style={[styles.sectionLabel, { color: PROFILE_SETTINGS.text.section, textAlign }]}>
            {isRTL ? "مدة استشارة الفيديو" : "Consultation duration"}
          </Text>
          <View style={{ flexDirection: dir, gap: 8, flexWrap: "wrap" }}>
            {VIDEO_DURATIONS.map((opt) => {
              const on = videoConsultationMinutes === opt.m;
              return (
                <Pressable
                  key={opt.m}
                  onPress={() => setVideoConsultationMinutes(opt.m)}
                  style={[
                    styles.durationChip,
                    {
                      backgroundColor: on ? `${PROFILE_SETTINGS.brand}18` : PROFILE_SETTINGS.bg.app,
                      borderColor: on ? PROFILE_SETTINGS.brand : PROFILE_SETTINGS.border,
                    },
                  ]}
                >
                  <Text
                    style={{
                      color: on ? PROFILE_SETTINGS.brand : colors.foreground,
                      fontWeight: "700",
                      fontSize: 14,
                    }}
                  >
                    {isRTL ? opt.ar : opt.en}
                  </Text>
                </Pressable>
              );
            })}
          </View>

          <View
            style={[
              styles.immediateRow,
              { flexDirection: dir, borderColor: PROFILE_SETTINGS.border, backgroundColor: PROFILE_SETTINGS.bg.app },
            ]}
          >
            <View style={{ flex: 1 }}>
              <Text style={{ color: colors.foreground, fontWeight: "700", fontSize: 14, textAlign }}>
                {t.auth.immediateCalls}
              </Text>
              <Text style={{ color: PROFILE_SETTINGS.text.secondary, fontSize: 12, lineHeight: 17, textAlign }}>
                {t.auth.immediateCallsHint}
              </Text>
            </View>
            <Switch
              value={immediateCallEnabled}
              onValueChange={setImmediateCallEnabled}
              trackColor={{ false: PROFILE_SETTINGS.border, true: `${PROFILE_SETTINGS.brand}88` }}
              thumbColor={immediateCallEnabled ? PROFILE_SETTINGS.brand : undefined}
            />
          </View>
        </View>
      </SettingsCard>

      {Platform.OS !== "web" ? (
        <Pressable
          onPress={() => router.push("/(tabs)/intake")}
          style={[styles.linkCard, { borderColor: PROFILE_SETTINGS.border }]}
        >
          <Text style={{ color: PROFILE_SETTINGS.brand, fontWeight: "700", textAlign }}>
            {isRTL ? "منشئ فحوصات المتابعة" : "Follow-up exam builder"}
          </Text>
        </Pressable>
      ) : null}
    </View>
  );

  const verificationsTab = (
    <View style={styles.tabContent}>
      <SettingsCard title={isRTL ? "التوقيع الرقمي" : "Digital signature"} isRTL={isRTL}>
        <DoctorDigitalSignatureField
          previewUri={digitalSignaturePreview}
          uploading={signatureUploading}
          onPick={pickDigitalSignature}
          onClear={clearDigitalSignature}
          isRTL={isRTL}
        />
      </SettingsCard>

      <SettingsCard title={isRTL ? "الشهادات والتراخيص" : "Medical certificates & licenses"} isRTL={isRTL}>
        <View style={styles.stack}>
          {certifications.map((cert, i) => (
            <View
              key={cert.url}
              style={[styles.certCard, { borderColor: PROFILE_SETTINGS.border }]}
            >
              <View style={[styles.certHead, { flexDirection: dir }]}>
                <FileText size={18} color={PROFILE_SETTINGS.brand} />
                <Text
                  style={[styles.certName, { color: colors.foreground, textAlign }]}
                  numberOfLines={1}
                >
                  {certFileName(cert.url, i)}
                </Text>
                <Pressable
                  onPress={() => removeCertification(cert.url)}
                  accessibilityRole="button"
                  accessibilityLabel={isRTL ? "حذف" : "Remove"}
                >
                  <Text style={{ color: PROFILE_SETTINGS.text.secondary, fontWeight: "700" }}>×</Text>
                </Pressable>
              </View>
              <AppTextInput
                value={cert.description}
                onChangeText={(v) => setCertificationDescription(cert.url, v)}
                placeholder={isRTL ? "وصف الشهادة (اختياري)" : "Certificate description (optional)"}
                placeholderTextColor={colors.mutedForeground}
                style={[
                  styles.certInput,
                  {
                    color: colors.foreground,
                    borderColor: PROFILE_SETTINGS.border,
                    backgroundColor: PROFILE_SETTINGS.bg.app,
                    textAlign,
                  },
                ]}
              />
            </View>
          ))}
          <Pressable
            onPress={() => void addCertification()}
            disabled={certUploading}
            style={[styles.certAddBtn, { borderColor: PROFILE_SETTINGS.brand, flexDirection: dir }]}
          >
            {certUploading ? (
              <ActivityIndicator color={PROFILE_SETTINGS.brand} size="small" />
            ) : (
              <>
                <Plus size={18} color={PROFILE_SETTINGS.brand} />
                <Text style={{ color: PROFILE_SETTINGS.brand, fontWeight: "700" }}>
                  {isRTL ? "إضافة شهادة" : "Add certification"}
                </Text>
              </>
            )}
          </Pressable>
        </View>
      </SettingsCard>
    </View>
  );

  const surgeryTab = (
    <View style={styles.tabContent}>
      <SettingsCard title={isRTL ? "مواعيد العمليات في المستشفيات" : "Surgery slots at hospitals"} isRTL={isRTL}>
        {accessToken ? <SurgeryAvailabilityEditor token={accessToken} isRTL={isRTL} /> : null}
      </SettingsCard>
    </View>
  );

  const tabPanels: Record<DoctorSettingsTabId, React.ReactNode> = {
    personal: personalTab,
    practice: practiceTab,
    pricing: pricingTab,
    availability: availabilityTab,
    surgery: surgeryTab,
    verifications: verificationsTab,
  };

  return (
    <View style={[styles.page, { backgroundColor: PROFILE_SETTINGS.bg.app }]}>
      <View
        style={[
          styles.headerShell,
          Platform.OS === "web"
            ? ({
                position: "sticky",
                top: 0,
                zIndex: 30,
              } as object)
            : null,
          { backgroundColor: PROFILE_SETTINGS.bg.app, borderBottomColor: PROFILE_SETTINGS.border },
        ]}
      >
        <View style={[styles.container, { maxWidth: WEB_MAX_WIDTH.profile }]}>
          <View
            style={[
              styles.pageHeader,
              mobileTitlePaddingTop > 0 && { paddingTop: mobileTitlePaddingTop },
            ]}
          >
            <Text style={[styles.pageTitle, { color: PROFILE_SETTINGS.text.primary, textAlign }]}>
              {isRTL ? "إعدادات الطبيب" : "Doctor Settings"}
            </Text>
            <Text style={[styles.pageSubtitle, { color: PROFILE_SETTINGS.text.secondary, textAlign }]}>
              {t.settings.profileSubtitle}
            </Text>
          </View>

          <DoctorProfileHeader
            name={name}
            email={account?.email}
            displayPhoto={displayPhoto}
            onPickPhoto={pickPhoto}
            specialityIds={specialityIds}
            specialities={specialities}
            locale={locale}
            isRTL={isRTL}
            isVerified={isVerified}
          />

          <DoctorSettingsTabBar activeTab={activeTab} onTabChange={setActiveTab} isRTL={isRTL} />
        </View>
      </View>

      <ScrollView
        style={styles.scroll}
        contentContainerStyle={[
          styles.scrollContent,
          { paddingBottom: saveChromeHeight + dockPadBottom + fabClearance },
        ]}
        keyboardShouldPersistTaps="handled"
      >
        <View style={[styles.container, { maxWidth: WEB_MAX_WIDTH.profile }]}>
          {tabPanels[activeTab]}
        </View>
      </ScrollView>

      <DoctorSettingsSaveDock
        saving={saving}
        onSave={handleSave}
        showLogout={showLogout}
        onLogout={onLogout}
        isRTL={isRTL}
        desktop={isDesktop}
        maxWidth={WEB_MAX_WIDTH.profile}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  page: { flex: 1, minHeight: 0, width: "100%" },
  headerShell: {
    borderBottomWidth: 1,
    paddingHorizontal: desktopPadding(),
    paddingBottom: 8,
  },
  scroll: { flex: 1 },
  scrollContent: {
    flexGrow: 1,
    paddingHorizontal: desktopPadding(),
    paddingTop: 16,
    paddingBottom: 24,
  },
  container: {
    width: "100%",
    alignSelf: "center",
    gap: 12,
  },
  pageHeader: {
    paddingHorizontal: 4,
    paddingBottom: 4,
    gap: 6,
  },
  pageTitle: {
    fontSize: 28,
    fontWeight: "800",
    lineHeight: 34,
  },
  pageSubtitle: {
    fontSize: 15,
    lineHeight: 22,
    maxWidth: 640,
  },
  tabContent: {
    gap: 12,
    paddingTop: 4,
  },
  card: {
    borderWidth: 1,
    borderRadius: PROFILE_SETTINGS.radius.card,
    padding: PROFILE_SETTINGS.cardPadding,
    gap: 16,
    width: "100%",
    maxWidth: "100%",
    overflow: "hidden",
  },
  cardTitle: {
    fontSize: 16,
    fontWeight: "800",
  },
  sectionLabel: {
    fontSize: 14,
    fontWeight: "700",
    marginBottom: 6,
  },
  hint: {
    fontSize: 13,
    lineHeight: 18,
    marginBottom: 8,
  },
  stack: { gap: 12 },
  durationChip: {
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderRadius: PROFILE_SETTINGS.radius.control,
    borderWidth: 1,
  },
  immediateRow: {
    alignItems: "center",
    gap: 12,
    paddingHorizontal: 12,
    paddingVertical: 10,
    borderRadius: PROFILE_SETTINGS.radius.card,
    borderWidth: 1,
  },
  linkCard: {
    borderWidth: 1,
    borderRadius: PROFILE_SETTINGS.radius.card,
    padding: 16,
    alignItems: "center",
  },
  certCard: {
    borderWidth: 1,
    borderRadius: PROFILE_SETTINGS.radius.control,
    padding: 12,
    gap: 8,
  },
  certHead: {
    alignItems: "center",
    gap: 8,
  },
  certName: {
    flex: 1,
    fontWeight: "700",
    fontSize: 14,
  },
  certInput: {
    borderWidth: 1,
    borderRadius: PROFILE_SETTINGS.radius.control,
    paddingHorizontal: 12,
    paddingVertical: 10,
    fontSize: 14,
    minHeight: 42,
  },
  certAddBtn: {
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    paddingVertical: 12,
    borderRadius: PROFILE_SETTINGS.radius.control,
    borderWidth: 1.5,
    borderStyle: "dashed",
  },
});

function desktopPadding(): number {
  return Platform.OS === "web" ? 24 : PROFILE_SETTINGS.mobilePadding;
}
