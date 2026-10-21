import React from "react";
import {
  ActivityIndicator,
  Image,
  Pressable,
  ScrollView,
  StyleSheet,
  Switch,
  Text,
  TextInput,
  View,
  type ViewStyle,
} from "react-native";
import { AppTextInput } from "@/components/AppTextInput";
import { CountrySelectField } from "@/components/auth/CountrySelectField";
import { ProfileChangePasswordField } from "@/components/profile/ProfileChangePasswordField";
import { ProfileCountryField } from "@/components/profile/ProfileCountryField";
import { DoctorFeesFields } from "@/components/profile/DoctorFeesFields";
import { DoctorPaymentMethodFields } from "@/components/profile/DoctorPaymentMethodFields";
import {
  normalizeMarketCountry,
  PATIENT_COUNTRY_CODES,
} from "@/constants/patientCountries";

import { useRouter } from "expo-router";
import { Camera, FileText, LogOut, Plus, UserRound, X } from "lucide-react-native";
import { EgpPriceInput } from "@/components/EgpPriceInput";
import { DoctorAvailabilityEditor } from "@/components/DoctorAvailabilityEditor";
import { ProfileLanguageField } from "@/components/profile/ProfileLanguageField";
import { ProfileThemeField } from "@/components/profile/ProfileThemeField";
import { ProfileAiField } from "@/components/profile/ProfileAiField";
import { SpecialityMultiSelect } from "@/components/profile/SpecialityMultiSelect";
import { PendingSpecialityChangeBanner } from "@/components/profile/PendingSpecialityChangeBanner";
import { DoctorTagsInput } from "@/components/profile/DoctorTagsInput";
import { profileSaveChromeHeight, profileSaveDockBottomPad } from "@/components/profile/profileSaveChrome";
import { WEB_MAX_WIDTH } from "@/constants/webLayout";
import { DoctorSettingsEditor } from "@/components/profile/DoctorSettingsEditor";
import { navigateToWelcome } from "@/domains/auth/navigation";
import { useAuthStore } from "@/domains/auth/store";
import { useColors } from "@/hooks/useColors";
import { useI18n } from "@/hooks/useI18n";
import { useMobileWebPageTitlePaddingTop } from "@/hooks/useMobileWebPageTitlePaddingTop";
import { useProfileEditor } from "@/hooks/useProfileEditor";
import { useProductTourStore } from "@/domains/onboarding/productTourStore";
import { useWebLayout } from "@/hooks/useWebLayout";
import { webConfirm } from "@/utils/webConfirm";
import { SafeAreaView, useSafeAreaInsets } from "react-native-safe-area-context";

interface Props {
  accessToken: string;
  role: string;
  isRTL: boolean;
  colors: ReturnType<typeof useColors>;
}

const VIDEO_DURATIONS = [
  { m: 30, en: "30 min", ar: "٣٠ دقيقة" },
  { m: 60, en: "1 hour", ar: "ساعة" },
  { m: 120, en: "2 hours", ar: "ساعتان" },
];

function profileRowsStyle(): ViewStyle {
  return { gap: 12 };
}

function profileRowStyle(desktop: boolean): ViewStyle {
  if (!desktop) {
    return { flexDirection: "column", gap: 12 };
  }
  return {
    flexDirection: "row",
    gap: 12,
    alignItems: "stretch",
  };
}

function profileHalfStyle(desktop: boolean): ViewStyle {
  if (!desktop) {
    return { width: "100%", minWidth: 0 };
  }
  return { flex: 1, minWidth: 0, alignSelf: "stretch" };
}

function profileFullStyle(): ViewStyle {
  return { width: "100%", minWidth: 0 };
}

function fieldGridStyle(desktop: boolean, columns = 2): ViewStyle {
  if (!desktop || columns <= 1) {
    return { flexDirection: "column", gap: 12 };
  }
  return {
    display: "grid",
    gridTemplateColumns: "repeat(2, minmax(0, 1fr))",
    gap: 12,
    alignItems: "start",
  } as unknown as ViewStyle;
}

export function ProfileEditorWebView({ accessToken, role, isRTL, colors }: Props) {
  const { t, locale } = useI18n();
  const router = useRouter();
  const logout = useAuthStore((s) => s.logout);
  const authRole = useAuthStore((s) => s.role);
  const doctorId = useAuthStore((s) => s.doctorId);
  const { isDesktop } = useWebLayout();
  const mobileTitlePaddingTop = useMobileWebPageTitlePaddingTop();
  const insets = useSafeAreaInsets();
  const showLogout = !isDesktop;
  const desktopSplit = isDesktop;
  const dir = isRTL ? "row-reverse" : "row";
  const textAlign = isRTL ? "right" : "left";
  const saveChromeHeight = profileSaveChromeHeight({ withLogout: showLogout });
  const dockPadBottom = profileSaveDockBottomPad(insets.bottom);

  const editor = useProfileEditor({ accessToken, role, isRTL });
  const advanceOnAnchorTap = useProductTourStore((s) => s.advanceOnAnchorTap);
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
    birthDate,
    setBirthDate,
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
    specialityId,
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
    isDoctor,
    displayPhoto,
    pickPhoto,
    save,
    pendingSpecialityChange,
  } = editor;

  const roleLabel = isDoctor ? t.auth.doctor : t.auth.patient;

  const cardBase = [styles.card, { backgroundColor: colors.card, borderColor: colors.border }];
  const rowsStyle = profileRowsStyle();
  const rowStyle = profileRowStyle(desktopSplit);
  const halfStyle = profileHalfStyle(desktopSplit);
  const fullStyle = profileFullStyle();
  const fields2 = fieldGridStyle(desktopSplit, 2);
  const spanFull = desktopSplit ? ({ gridColumn: "1 / -1" } as ViewStyle) : undefined;

  const handleLogout = () => {
    const confirmed = webConfirm(t.tabs.logout, t.tabs.logoutConfirm);
    if (!confirmed) return;
    logout();
    navigateToWelcome(router);
  };

  const actionButtons = (
    <View
      style={[
        showLogout ? styles.mobileActions : styles.footerInner,
        !showLogout && { maxWidth: WEB_MAX_WIDTH.profile, flexDirection: dir, gap: 10 },
      ]}
    >
      <Pressable
        testID="profile-save"
        onPress={() => {
          advanceOnAnchorTap("profile-save");
          void save();
        }}
        disabled={saving}
        style={[
          styles.saveBtn,
          { backgroundColor: colors.primary, opacity: saving ? 0.7 : 1 },
          showLogout ? styles.mobileFullBtn : null,
        ]}
      >
        {saving ? (
          <ActivityIndicator color="#fff" />
        ) : (
          <Text style={styles.saveBtnText}>{t.settings.saveChanges}</Text>
        )}
      </Pressable>
      {showLogout ? (
        <Pressable
          onPress={handleLogout}
          style={[
            styles.logoutBtn,
            styles.mobileFullBtn,
            { borderColor: colors.border, flexDirection: dir },
          ]}
        >
          <LogOut size={16} color="#ef4444" />
          <Text style={styles.logoutText}>{t.tabs.logout}</Text>
        </Pressable>
      ) : null}
    </View>
  );

  if (loading) {
    return (
      <View style={[styles.page, { backgroundColor: colors.background }]}>
        <ActivityIndicator style={{ marginTop: 80 }} color={colors.primary} />
      </View>
    );
  }

  const isDoctorUser =
    isDoctor ||
    role.toLowerCase() === "doctor" ||
    authRole?.toLowerCase() === "doctor" ||
    Boolean(doctorId);

  if (isDoctorUser) {
    return (
      <DoctorSettingsEditor
        accessToken={accessToken}
        editor={editor}
        showLogout={showLogout}
        onLogout={handleLogout}
      />
    );
  }

  return (
    <View style={[styles.page, { backgroundColor: colors.background }]}>
      <ScrollView
        style={styles.scroll}
        contentContainerStyle={[
          styles.scrollContent,
          { paddingBottom: saveChromeHeight + dockPadBottom + 24 },
        ]}
        keyboardShouldPersistTaps="handled"
      >
        <View style={[styles.container, { maxWidth: WEB_MAX_WIDTH.profile }]}>
          <View
            style={[
              styles.pageHeader,
              mobileTitlePaddingTop > 0 && { paddingTop: mobileTitlePaddingTop },
            ]}
          >
            <Text style={[styles.pageTitle, { color: colors.foreground, textAlign }]}>
              {t.settings.personalInfo}
            </Text>
            <Text style={[styles.pageSubtitle, { color: colors.mutedForeground, textAlign }]}>
              {t.settings.profileSubtitle}
            </Text>
          </View>

          <View
            style={[
              styles.card,
              styles.heroCard,
              { backgroundColor: colors.card, borderColor: colors.border },
            ]}
          >
            <View style={[styles.heroRow, { flexDirection: dir }]}>
              <Pressable onPress={pickPhoto} style={styles.avatarWrap}>
                {displayPhoto ? (
                  <Image
                    source={{ uri: displayPhoto }}
                    style={[
                      styles.avatar,
                      { backgroundColor: colors.muted, borderColor: colors.border },
                    ]}
                  />
                ) : (
                  <View
                    style={[
                      styles.avatar,
                      {
                        backgroundColor: colors.muted,
                        borderColor: colors.border,
                        alignItems: "center",
                        justifyContent: "center",
                      },
                    ]}
                  >
                    <UserRound size={40} color={colors.mutedForeground} />
                  </View>
                )}
                <View style={[styles.avatarBadge, { backgroundColor: colors.primary }]}>
                  <Camera size={16} color="#fff" />
                </View>
              </Pressable>

              <View style={[styles.heroMeta, { alignItems: isRTL ? "flex-end" : "flex-start" }]}>
                <Text style={[styles.heroName, { color: colors.foreground, textAlign }]} numberOfLines={2}>
                  {name.trim() || (isRTL ? "مستخدم" : "User")}
                </Text>
                <Text
                  style={[styles.heroEmail, { color: colors.mutedForeground, textAlign }]}
                  numberOfLines={1}
                >
                  {account?.email}
                </Text>
                <View style={[styles.heroBadges, { flexDirection: dir }]}>
                  <View style={[styles.rolePill, { backgroundColor: `${colors.primary}14` }]}>
                    <Text style={[styles.rolePillText, { color: colors.primary }]}>{roleLabel}</Text>
                  </View>
                  <Text style={[styles.heroHint, { color: colors.mutedForeground }]}>
                    {isRTL ? "اضغط على الصورة لتغييرها" : "Click photo to update"}
                  </Text>
                </View>
              </View>
            </View>
          </View>

          <View style={rowsStyle}>
            <View style={rowStyle}>
            <View style={[...cardBase, halfStyle]}>
              <Text style={[styles.cardTitle, { color: colors.foreground, textAlign }]}>
                {t.settings.personalInfo}
              </Text>
              <View style={fields2}>
                <ProfileField
                  label={isRTL ? "الاسم" : "Name"}
                  value={name}
                  onChangeText={setName}
                  colors={colors}
                  isRTL={isRTL}
                />
                <ProfileField
                  label={isRTL ? "الهاتف" : "Phone"}
                  value={phone}
                  onChangeText={setPhone}
                  keyboardType="phone-pad"
                  colors={colors}
                  isRTL={isRTL}
                />
                {!isDoctor ? (
                  <>
                    <ProfileField
                      label={isRTL ? "تاريخ الميلاد" : "Birth date"}
                      value={birthDate}
                      onChangeText={setBirthDate}
                      placeholder="YYYY-MM-DD"
                      colors={colors}
                      isRTL={isRTL}
                    />
                    <ProfileField
                      label={isRTL ? "البريد الإلكتروني" : "Email"}
                      value={account?.email ?? ""}
                      editable={false}
                      colors={colors}
                      isRTL={isRTL}
                    />
                  </>
                ) : (
                  <View style={spanFull}>
                    <ProfileField
                      label={isRTL ? "البريد الإلكتروني" : "Email"}
                      value={account?.email ?? ""}
                      editable={false}
                      colors={colors}
                      isRTL={isRTL}
                    />
                  </View>
                )}
                {/* Saved with the rest of the form, not on tap. */}
                <View style={spanFull}>
                  {isDoctor ? (
                    <ProfileCountryField
                      value={normalizeMarketCountry(country)}
                      onChange={setCountry}
                      disabled={saving}
                    />
                  ) : (
                    <CountrySelectField
                      label={t.auth.countryOfResidence}
                      value={country}
                      codes={PATIENT_COUNTRY_CODES}
                      onChange={setCountry}
                      isRTL={isRTL}
                      disabled={saving}
                    />
                  )}
                </View>
              </View>
            </View>

            <View style={[...cardBase, halfStyle]}>
              <Text style={[styles.cardTitle, { color: colors.foreground, textAlign }]}>
                {t.settings.changePassword}
              </Text>
              <ProfileChangePasswordField accessToken={accessToken} />
            </View>

            <View style={[...cardBase, halfStyle]}>
              <Text style={[styles.cardTitle, { color: colors.foreground, textAlign }]}>
                {t.settings.preferences}
              </Text>
              <View style={fields2}>
                <ProfileLanguageField embedded wideCards />
                <ProfileThemeField />
                <View style={spanFull}>
                  <ProfileAiField />
                </View>
              </View>
            </View>
            </View>

            {isDoctor ? (
              <View style={[...cardBase, fullStyle]}>
                <Text style={[styles.cardTitle, { color: colors.foreground, textAlign }]}>
                  {isRTL ? "أسعار الاستشارة" : "Consultation prices"}
                </Text>
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
                />
              </View>
            ) : null}

            {isDoctor ? (
              <>
                <View style={rowStyle}>
                  <View style={[...cardBase, halfStyle]}>
                    <Text style={[styles.cardTitle, { color: colors.foreground, textAlign }]}>
                      {isRTL ? "البيانات المهنية" : "Professional details"}
                    </Text>
                    <View style={fields2}>
                      <ProfileField
                        label={isRTL ? "المسمى الوظيفي" : "Professional title"}
                        value={professionalTitle}
                        onChangeText={setProfessionalTitle}
                        colors={colors}
                        isRTL={isRTL}
                      />
                      <View style={spanFull}>
                        <Text style={[styles.fieldLabel, { color: colors.mutedForeground, textAlign }]}>
                          {t.settings.personalClinicLocation}
                        </Text>
                        <Text style={[styles.hint, { color: colors.mutedForeground, textAlign }]}>
                          {t.settings.googleMapsLocationHint}
                        </Text>
                        <ProfileField
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
                  </View>

                  <View style={[...cardBase, halfStyle]}>
                    <Text style={[styles.cardTitle, { color: colors.foreground, textAlign }]}>
                      {isRTL ? "الملف والتخصصات" : "Profile & specialities"}
                    </Text>
                    <View style={styles.cardBody}>
                      <ProfileField
                        label={isRTL ? "نبذة عن الطبيب" : "About / doctor info"}
                        value={info}
                        onChangeText={setInfo}
                        placeholder={
                          isRTL ? "خبرات، اهتمامات طبية..." : "Experience, focus areas..."
                        }
                        multiline
                        colors={colors}
                        isRTL={isRTL}
                      />
                      <View>
                        <Text style={[styles.sectionLabel, styles.sectionLabelTight, { color: colors.foreground, textAlign }]}>
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
                        <Text style={[styles.sectionLabel, styles.sectionLabelTight, { color: colors.foreground, textAlign }]}>
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
                  </View>
                </View>

                <View style={rowStyle}>
                <View style={[...cardBase, halfStyle]}>
                  <Text style={[styles.cardTitle, { color: colors.foreground, textAlign }]}>
                    {isRTL ? "طريقة استلام الدفع" : "Patient payment"}
                  </Text>
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
                </View>

                <View style={[...cardBase, halfStyle]}>
                  <Text style={[styles.cardTitle, { color: colors.foreground, textAlign }]}>
                    {isRTL ? "الشهادات والتوقيع" : "Credentials"}
                  </Text>
                  <View
                    style={
                      desktopSplit
                        ? ([styles.credSplit, { flexDirection: dir }] as ViewStyle)
                        : styles.cardBody
                    }
                  >
                    <View style={desktopSplit ? styles.credCol : undefined}>
                      <Text style={[styles.sectionLabel, styles.sectionLabelTight, { color: colors.foreground, textAlign }]}>
                        {t.settings.digitalSignature}
                      </Text>
                      <Text style={[styles.hint, { color: colors.mutedForeground, textAlign }]}>
                        {t.settings.signatureHint}
                      </Text>
                      {digitalSignaturePreview ? (
                        <View style={[styles.signaturePreviewWrap, { borderColor: colors.border }]}>
                          <Image
                            source={{ uri: digitalSignaturePreview }}
                            style={styles.signaturePreview}
                            resizeMode="contain"
                          />
                          <Pressable
                            onPress={clearDigitalSignature}
                            style={[styles.signatureClear, { flexDirection: dir }]}
                            accessibilityRole="button"
                            accessibilityLabel={isRTL ? "حذف التوقيع" : "Remove signature"}
                          >
                            <X size={16} color={colors.mutedForeground} />
                            <Text style={{ color: colors.mutedForeground, fontWeight: "600", fontSize: 13 }}>
                              {isRTL ? "إزالة" : "Remove"}
                            </Text>
                          </Pressable>
                        </View>
                      ) : null}
                      <Pressable
                        onPress={() => void pickDigitalSignature()}
                        disabled={signatureUploading}
                        style={[
                          styles.certAddBtn,
                          { borderColor: colors.primary, flexDirection: dir },
                        ]}
                      >
                        {signatureUploading ? (
                          <ActivityIndicator color={colors.primary} size="small" />
                        ) : (
                          <>
                            <Plus size={18} color={colors.primary} />
                            <Text style={{ color: colors.primary, fontWeight: "700" }}>
                              {digitalSignaturePreview
                                ? isRTL
                                  ? "استبدال الصورة"
                                  : "Replace image"
                                : t.settings.pickImage}
                            </Text>
                          </>
                        )}
                      </Pressable>
                    </View>

                    {desktopSplit ? (
                      <View style={[styles.consultDivider, { backgroundColor: colors.border }]} />
                    ) : null}

                    <View style={desktopSplit ? styles.credCol : undefined}>
                      <Text style={[styles.sectionLabel, styles.sectionLabelTight, { color: colors.foreground, textAlign }]}>
                        {isRTL ? "الشهادات" : "Certifications"}
                      </Text>
                      {certifications.map((cert, i) => (
                        <View
                          key={cert.url}
                          style={[styles.certCard, { borderColor: colors.border }]}
                        >
                          <View style={[styles.certHead, { flexDirection: dir }]}>
                            <FileText size={18} color={colors.primary} />
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
                              <X size={18} color={colors.mutedForeground} />
                            </Pressable>
                          </View>
                          <AppTextInput
                            value={cert.description}
                            onChangeText={(v) => setCertificationDescription(cert.url, v)}
                            placeholder={
                              isRTL ? "وصف الشهادة (اختياري)" : "Certificate description (optional)"
                            }
                            placeholderTextColor={colors.mutedForeground}
                            style={[
                              styles.input,
                              {
                                color: colors.foreground,
                                borderColor: colors.border,
                                backgroundColor: colors.muted,
                                textAlign,
                              },
                            ]}
                          />
                        </View>
                      ))}
                      <Pressable
                        onPress={() => void addCertification()}
                        disabled={certUploading}
                        style={[
                          styles.certAddBtn,
                          { borderColor: colors.primary, flexDirection: dir },
                        ]}
                      >
                        {certUploading ? (
                          <ActivityIndicator color={colors.primary} size="small" />
                        ) : (
                          <>
                            <Plus size={18} color={colors.primary} />
                            <Text style={{ color: colors.primary, fontWeight: "700" }}>
                              {isRTL ? "إضافة شهادة" : "Add certification"}
                            </Text>
                          </>
                        )}
                      </Pressable>
                    </View>
                  </View>
                </View>
                </View>

                <View style={[...cardBase, fullStyle]}>
                  <Text style={[styles.cardTitle, { color: colors.foreground, textAlign }]}>
                    {isRTL ? "الاستشارات" : "Consultations"}
                  </Text>
                  <View
                    style={
                      desktopSplit
                        ? ([styles.consultSplit, { flexDirection: dir }] as ViewStyle)
                        : styles.cardBody
                    }
                  >
                    {accessToken ? (
                      <View style={desktopSplit ? styles.consultCol : undefined}>
                        <DoctorAvailabilityEditor isRTL={isRTL} token={accessToken} embedded />
                      </View>
                    ) : null}
                    {accessToken && desktopSplit ? (
                      <View style={[styles.consultDivider, { backgroundColor: colors.border }]} />
                    ) : null}
                    <View style={desktopSplit ? styles.consultCol : undefined}>
                      {accessToken && !desktopSplit ? (
                        <View style={[styles.sectionDivider, { backgroundColor: colors.border }]} />
                      ) : null}
                      <Text style={[styles.sectionLabel, styles.sectionLabelTight, { color: colors.foreground, textAlign }]}>
                        {isRTL ? "مدة استشارة الفيديو" : "Video consultation duration"}
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
                                  backgroundColor: on ? `${colors.primary}18` : colors.muted,
                                  borderColor: on ? colors.primary : colors.border,
                                },
                              ]}
                            >
                              <Text
                                style={{
                                  color: on ? colors.primary : colors.foreground,
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
                          { flexDirection: dir, borderColor: colors.border, backgroundColor: colors.muted },
                        ]}
                      >
                        <View style={{ flex: 1 }}>
                          <Text
                            style={{
                              color: colors.foreground,
                              fontWeight: "700",
                              fontSize: 14,
                              textAlign,
                            }}
                          >
                            {t.auth.immediateCalls}
                          </Text>
                          <Text
                            style={{
                              color: colors.mutedForeground,
                              fontSize: 12,
                              lineHeight: 17,
                              textAlign,
                            }}
                          >
                            {t.auth.immediateCallsHint}
                          </Text>
                        </View>
                        <Switch
                          value={immediateCallEnabled}
                          onValueChange={setImmediateCallEnabled}
                          trackColor={{ false: colors.border, true: `${colors.primary}88` }}
                          thumbColor={immediateCallEnabled ? colors.primary : undefined}
                        />
                      </View>
                    </View>
                  </View>
                </View>
              </>
            ) : null}
          </View>
        </View>
      </ScrollView>

      <SafeAreaView
        edges={["bottom"]}
        style={[
          styles.footer,
          {
            backgroundColor: colors.card,
            borderTopColor: colors.border,
          },
        ]}
      >
        {actionButtons}
      </SafeAreaView>
    </View>
  );
}

function certFileName(url: string, index: number): string {
  try {
    const raw = decodeURIComponent(url.split("?")[0].split("/").pop() ?? "");
    // Uploads are stored as `<uuid>-<original>`; drop the uuid prefix.
    const cleaned = raw.replace(/^[0-9a-f-]{36}-/i, "");
    if (cleaned) return cleaned;
  } catch {
    // fall through to generic label
  }
  return `Certificate ${index + 1}`;
}

function ProfileField({
  label,
  value,
  onChangeText,
  editable = true,
  placeholder,
  keyboardType,
  autoCapitalize,
  multiline = false,
  colors,
  isRTL,
}: {
  label: string;
  value: string;
  onChangeText?: (v: string) => void;
  editable?: boolean;
  placeholder?: string;
  keyboardType?: "default" | "phone-pad" | "number-pad";
  autoCapitalize?: "none" | "sentences" | "words" | "characters";
  multiline?: boolean;
  colors: ReturnType<typeof useColors>;
  isRTL: boolean;
}) {
  return (
    <View style={styles.field}>
      {label ? (
        <Text style={[styles.fieldLabel, { color: colors.mutedForeground }]}>{label}</Text>
      ) : null}
      <AppTextInput
        value={value}
        onChangeText={onChangeText}
        editable={editable}
        placeholder={placeholder}
        placeholderTextColor={colors.mutedForeground}
        keyboardType={keyboardType}
        autoCapitalize={autoCapitalize}
        multiline={multiline}
        style={[
          styles.input,
          multiline && styles.inputMultiline,
          {
            color: editable ? colors.foreground : colors.mutedForeground,
            borderColor: colors.border,
            backgroundColor: editable ? colors.muted : `${colors.muted}88`,
            textAlign: isRTL ? "right" : "left",
            textAlignVertical: multiline ? "top" : "center",
          },
        ]}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  page: {
    flex: 1,
    minHeight: 0,
    width: "100%",
  },
  scroll: {
    flex: 1,
  },
  scrollContent: {
    flexGrow: 1,
    alignItems: "stretch",
    paddingHorizontal: 24,
    paddingTop: 8,
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
    fontSize: 30,
    fontWeight: "800",
    lineHeight: 36,
  },
  pageSubtitle: {
    fontSize: 15,
    lineHeight: 22,
    maxWidth: 640,
  },
  card: {
    borderWidth: 1,
    borderRadius: 16,
    padding: 16,
    gap: 0,
    minWidth: 0,
    flex: 1,
  },
  cardBody: {
    gap: 12,
  },
  consultSplit: {
    gap: 12,
    alignItems: "stretch",
  },
  consultCol: {
    flex: 1,
    minWidth: 0,
    gap: 12,
  },
  consultDivider: {
    width: StyleSheet.hairlineWidth,
    alignSelf: "stretch",
  },
  credSplit: {
    gap: 12,
    alignItems: "stretch",
  },
  credCol: {
    flex: 1,
    minWidth: 0,
    gap: 8,
  },
  immediateRow: {
    alignItems: "center",
    gap: 12,
    paddingHorizontal: 12,
    paddingVertical: 10,
    borderRadius: 12,
    borderWidth: 1,
  },
  sectionDivider: {
    height: StyleSheet.hairlineWidth,
    width: "100%",
  },
  hint: {
    fontSize: 13,
    lineHeight: 18,
    marginBottom: 8,
  },
  heroCard: {
    paddingVertical: 28,
  },
  heroRow: {
    alignItems: "center",
    gap: 24,
  },
  avatarWrap: {
    position: "relative",
  },
  avatar: {
    width: 96,
    height: 96,
    borderRadius: 48,
    borderWidth: 3,
  },
  avatarBadge: {
    position: "absolute",
    bottom: 2,
    right: 2,
    width: 32,
    height: 32,
    borderRadius: 16,
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 2,
    borderColor: "#fff",
  },
  heroMeta: {
    flex: 1,
    minWidth: 0,
    gap: 6,
  },
  heroName: {
    fontSize: 26,
    fontWeight: "800",
    lineHeight: 32,
  },
  heroEmail: {
    fontSize: 15,
    fontWeight: "600",
  },
  heroBadges: {
    flexWrap: "wrap",
    alignItems: "center",
    gap: 12,
    marginTop: 8,
  },
  rolePill: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 999,
  },
  rolePillText: {
    fontSize: 12,
    fontWeight: "800",
  },
  heroHint: {
    fontSize: 12,
    fontWeight: "600",
  },
  cardsRow: {
    gap: 16,
    flexDirection: "column",
  },
  cardTitle: {
    fontSize: 16,
    fontWeight: "800",
    marginBottom: 10,
  },
  sectionLabel: {
    fontSize: 14,
    fontWeight: "800",
    marginTop: 4,
    marginBottom: 10,
  },
  sectionLabelTight: {
    marginTop: 0,
  },
  field: {
    gap: 6,
  },
  fieldLabel: {
    fontSize: 12,
    fontWeight: "700",
  },
  input: {
    borderWidth: 1,
    borderRadius: 10,
    paddingHorizontal: 14,
    paddingVertical: 11,
    fontSize: 15,
  },
  inputMultiline: {
    minHeight: 72,
    paddingTop: 10,
  },
  durationChip: {
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 12,
    borderWidth: 1.5,
  },
  certCard: {
    gap: 10,
    borderWidth: 1,
    borderRadius: 12,
    paddingHorizontal: 14,
    paddingVertical: 12,
    marginBottom: 10,
  },
  certHead: {
    alignItems: "center",
    gap: 10,
  },
  certName: { flex: 1, fontSize: 14, fontWeight: "600" },
  certAddBtn: {
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    borderWidth: 1.5,
    borderStyle: "dashed",
    borderRadius: 12,
    paddingVertical: 13,
    marginTop: 4,
  },
  signaturePreviewWrap: {
    borderWidth: 1,
    borderRadius: 12,
    padding: 12,
    gap: 10,
    alignItems: "center",
    marginTop: 4,
  },
  signaturePreview: {
    width: "100%",
    height: 88,
  },
  signatureClear: {
    alignItems: "center",
    gap: 6,
  },
  footer: {
    borderTopWidth: StyleSheet.hairlineWidth,
    paddingHorizontal: 24,
    paddingTop: 12,
    paddingBottom: 16,
  },
  footerInner: {
    width: "100%",
    alignSelf: "center",
    flexDirection: "row",
    justifyContent: "flex-end",
    alignItems: "center",
  },
  mobileActions: {
    width: "100%",
    gap: 10,
  },
  mobileFullBtn: {
    width: "100%",
    minWidth: 0,
  },
  logoutBtn: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    paddingHorizontal: 18,
    paddingVertical: 13,
    borderRadius: 12,
    borderWidth: 1,
  },
  logoutText: { color: "#ef4444", fontWeight: "700", fontSize: 14 },
  saveBtn: {
    minWidth: 168,
    paddingHorizontal: 28,
    paddingVertical: 13,
    borderRadius: 12,
    alignItems: "center",
  },
  saveBtnText: {
    color: "#fff",
    fontWeight: "800",
    fontSize: 15,
  },
});
