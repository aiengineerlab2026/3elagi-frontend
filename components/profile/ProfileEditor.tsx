import { router } from "expo-router";
import { Camera, FileText, LogOut, Plus, UserRound, X } from "lucide-react-native";
import React from "react";
import {
  ActivityIndicator,
  Alert,
  Image,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Switch,
  Text,
  TextInput,
  View,
} from "react-native";
import { SafeAreaView, useSafeAreaInsets } from "react-native-safe-area-context";
import { AppTextInput } from "@/components/AppTextInput";
import { CountrySelectField } from "@/components/auth/CountrySelectField";
import {
  normalizeMarketCountry,
  PATIENT_COUNTRY_CODES,
} from "@/constants/patientCountries";
import { AppHeader } from "@/components/AppHeader";
import { KeyboardSafeScrollView } from "@/components/KeyboardSafeScrollView";
import { EgpPriceInput } from "@/components/EgpPriceInput";
import { DoctorAvailabilityEditor } from "@/components/DoctorAvailabilityEditor";
import { ProfileAiField } from "@/components/profile/ProfileAiField";
import { ProfileChangePasswordField } from "@/components/profile/ProfileChangePasswordField";
import { ProfileCountryField } from "@/components/profile/ProfileCountryField";
import { DoctorFeesFields } from "@/components/profile/DoctorFeesFields";
import { DoctorPaymentMethodFields } from "@/components/profile/DoctorPaymentMethodFields";
import { ProfileLanguageField } from "@/components/profile/ProfileLanguageField";
import { ProfileThemeField } from "@/components/profile/ProfileThemeField";
import { ProfileNotificationsField } from "@/components/profile/ProfileNotificationsField";
import { SpecialityMultiSelect } from "@/components/profile/SpecialityMultiSelect";
import { PendingSpecialityChangeBanner } from "@/components/profile/PendingSpecialityChangeBanner";
import { DoctorTagsInput } from "@/components/profile/DoctorTagsInput";
import {
  profileSaveChromeHeight,
  profileSaveDockBottomPad,
} from "@/components/profile/profileSaveChrome";
import { DoctorSettingsEditor } from "@/components/profile/DoctorSettingsEditor";
import { useAuthStore } from "@/domains/auth/store";
import { useColors } from "@/hooks/useColors";
import { useProfileEditor } from "@/hooks/useProfileEditor";
import { useProductTourStore } from "@/domains/onboarding/productTourStore";
import { useI18n } from "@/hooks/useI18n";

const AVATAR_SIZE = 76;

const VIDEO_DURATIONS = [
  { m: 30, en: "30 min", ar: "٣٠ دقيقة" },
  { m: 60, en: "1 hour", ar: "ساعة" },
  { m: 120, en: "2 hours", ar: "ساعتان" },
];

export function ProfileEditor({
  accessToken,
  role,
  isRTL,
  colors,
  showLogout = true,
}: {
  accessToken: string;
  role: string;
  isRTL: boolean;
  colors: ReturnType<typeof useColors>;
  showLogout?: boolean;
}) {
  const logout = useAuthStore((s) => s.logout);
  const { t, locale } = useI18n();
  const insets = useSafeAreaInsets();
  const dir = isRTL ? "row-reverse" : "row";
  const textAlign = isRTL ? "right" : "left";

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

  const displayName = name.trim() || (isRTL ? "مستخدم" : "Your name");
  const displayEmail = account?.email ?? (isRTL ? "—" : "—");
  const saveChromeHeight = profileSaveChromeHeight({ withLogout: showLogout });
  // Inside the tabs the bottom bar already covers the safe area, so adding the
  // inset here again left a dead gap under Log out.
  const dockPadBottom = profileSaveDockBottomPad(
    Platform.OS === "web" ? insets.bottom : 0,
  );

  const handleLogout = () => {
    Alert.alert(
      isRTL ? "تسجيل الخروج" : "Log out",
      isRTL ? "هل أنت متأكد؟" : "Are you sure?",
      [
        { text: isRTL ? "إلغاء" : "Cancel", style: "cancel" },
        {
          text: isRTL ? "خروج" : "Log out",
          style: "destructive",
          onPress: () => {
            logout();
            router.replace("/welcome");
          },
        },
      ],
    );
  };

  return (
    <View style={[styles.root, { backgroundColor: colors.background }]}>
      <AppHeader />
      {loading ? (
        <ActivityIndicator style={{ marginTop: 48 }} color={colors.primary} />
      ) : isDoctor ? (
        <DoctorSettingsEditor
          accessToken={accessToken}
          editor={editor}
          showLogout={showLogout}
          onLogout={handleLogout}
        />
      ) : (
        <>
        <KeyboardSafeScrollView
          style={styles.flex}
          contentContainerStyle={[
            styles.scrollContent,
            { paddingBottom: saveChromeHeight + dockPadBottom + 16 },
          ]}
          bottomOffset={32}
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}
        >
            <View
              style={[
                styles.profileHeaderCard,
                { backgroundColor: colors.card, borderColor: colors.border },
              ]}
            >
              <Pressable
                onPress={pickPhoto}
                style={styles.avatarWrap}
                accessibilityRole="button"
                accessibilityLabel={isRTL ? "تغيير الصورة" : "Change profile photo"}
              >
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
                    <UserRound size={34} color={colors.mutedForeground} />
                  </View>
                )}
                <View style={[styles.avatarBadge, { backgroundColor: colors.primary }]}>
                  <Camera size={14} color="#fff" />
                </View>
              </Pressable>

              <Text style={[styles.profileName, { color: colors.foreground, textAlign }]}>
                {displayName}
              </Text>
              <Text style={[styles.profileEmail, { color: colors.mutedForeground, textAlign }]}>
                {displayEmail}
              </Text>
              <Text style={[styles.avatarHint, { color: colors.mutedForeground, textAlign }]}>
                {isRTL ? "اضغط على الصورة للتغيير" : "Tap photo to update"}
              </Text>
            </View>

            <SectionCard
              title={isRTL ? "المعلومات الشخصية" : "Personal information"}
              colors={colors}
              textAlign={textAlign}
            >
              <Field
                label={isRTL ? "الاسم" : "Name"}
                value={name}
                onChangeText={setName}
                colors={colors}
                isRTL={isRTL}
              />
              <Field
                label={isRTL ? "الهاتف" : "Phone"}
                value={phone}
                onChangeText={setPhone}
                keyboardType="phone-pad"
                colors={colors}
                isRTL={isRTL}
              />
              {!isDoctor ? (
                <Field
                  label={isRTL ? "تاريخ الميلاد" : "Birth date"}
                  value={birthDate}
                  onChangeText={setBirthDate}
                  placeholder="YYYY-MM-DD"
                  colors={colors}
                  isRTL={isRTL}
                />
              ) : null}
              {/* Country ships with the Save changes button, not on tap.
                  Doctors pick a live market; patients pick where they live. */}
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
            </SectionCard>

            {isDoctor ? (
              <SectionCard
                title={isRTL ? "الملف المهني" : "Professional profile"}
                colors={colors}
                textAlign={textAlign}
              >
                <Field
                  label={isRTL ? "المسمى الوظيفي" : "Professional title"}
                  value={professionalTitle}
                  onChangeText={setProfessionalTitle}
                  colors={colors}
                  isRTL={isRTL}
                />
                <Text
                  style={[styles.fieldLabel, { color: colors.mutedForeground, textAlign }]}
                >
                  {t.settings.personalClinicLocation}
                </Text>
                <Text
                  style={[
                    styles.fieldHint,
                    { color: colors.mutedForeground, textAlign },
                  ]}
                >
                  {t.settings.googleMapsLocationHint}
                </Text>
                <Field
                  label=""
                  value={location}
                  onChangeText={setLocation}
                  placeholder={t.settings.googleMapsLocationPlaceholder}
                  autoCapitalize="none"
                  multiline
                  colors={colors}
                  isRTL={isRTL}
                />
                <Field
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
                <View style={styles.block}>
                  <Text
                    style={[styles.fieldLabel, { color: colors.mutedForeground, textAlign }]}
                  >
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
                <View style={styles.block}>
                  <Text
                    style={[styles.fieldLabel, { color: colors.mutedForeground, textAlign }]}
                  >
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
              </SectionCard>
            ) : null}

            {isDoctor ? (
              <SectionCard
                title={isRTL ? "أسعار الاستشارة" : "Consultation prices"}
                colors={colors}
                textAlign={textAlign}
              >
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
              </SectionCard>
            ) : null}

            {isDoctor ? (
              <SectionCard
                title={isRTL ? "طريقة استلام الدفع" : "Patient payment"}
                colors={colors}
                textAlign={textAlign}
              >
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
              </SectionCard>
            ) : null}

            {isDoctor ? (
              <SectionCard
                title={t.settings.digitalSignature}
                colors={colors}
                textAlign={textAlign}
              >
                <Text style={{ color: colors.mutedForeground, fontSize: 13, textAlign, lineHeight: 18 }}>
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
                      hitSlop={8}
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
              </SectionCard>
            ) : null}

            {isDoctor ? (
              <SectionCard
                title={isRTL ? "الشهادات" : "Certifications"}
                colors={colors}
                textAlign={textAlign}
              >
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
                        hitSlop={8}
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
                          backgroundColor: colors.background,
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
              </SectionCard>
            ) : null}

            {isDoctor ? (
              <Pressable
                onPress={() => router.push("/(tabs)/intake")}
                style={[styles.sectionLink, { borderColor: colors.border }]}
              >
                <Text style={{ color: colors.primary, fontWeight: "700", textAlign }}>
                  {isRTL ? "منشئ فحوصات المتابعة" : "Follow-up exam builder"}
                </Text>
              </Pressable>
            ) : null}

            {isDoctor ? (
              <View
                style={[
                  styles.sectionCard,
                  { backgroundColor: colors.card, borderColor: colors.border },
                ]}
              >
                <DoctorAvailabilityEditor isRTL={isRTL} token={accessToken} embedded />
              </View>
            ) : null}

            {isDoctor ? (
              <SectionCard
                title={isRTL ? "مدة استشارة الفيديو" : "Video consultation duration"}
                colors={colors}
                textAlign={textAlign}
              >
                <View style={[{ flexDirection: dir, gap: 8, flexWrap: "wrap" }]}>
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

                <View style={[styles.immediateCallRow, { flexDirection: dir }]}>
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
              </SectionCard>
            ) : null}

            <SectionCard
              title={t.settings.changePassword}
              colors={colors}
              textAlign={textAlign}
            >
              <ProfileChangePasswordField accessToken={accessToken} />
            </SectionCard>

            <SectionCard
              title={t.settings.preferences}
              colors={colors}
              textAlign={textAlign}
            >
              <ProfileLanguageField embedded wideCards />
              <ProfileThemeField />
              {Platform.OS !== "web" ? (
                <View style={{ marginTop: 12 }}>
                  <ProfileNotificationsField />
                </View>
              ) : null}
              <View style={{ marginTop: 12 }}>
                <ProfileAiField />
              </View>
            </SectionCard>
        </KeyboardSafeScrollView>

        <SafeAreaView
          edges={Platform.OS === "web" ? ["bottom"] : []}
          style={[
            styles.saveDock,
            {
              backgroundColor: colors.card,
              borderTopColor: colors.border,
            },
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
              styles.actionBtn,
              styles.saveBtn,
              { backgroundColor: colors.primary, opacity: saving ? 0.7 : 1 },
            ]}
          >
            {saving ? (
              <ActivityIndicator color="#fff" />
            ) : (
              <Text style={styles.saveBtnText}>
                {isRTL ? "حفظ التغييرات" : "Save changes"}
              </Text>
            )}
          </Pressable>

          {showLogout ? (
            <Pressable
              onPress={() =>
                Alert.alert(
                  isRTL ? "تسجيل الخروج" : "Log out",
                  isRTL ? "هل أنت متأكد؟" : "Are you sure?",
                  [
                    { text: isRTL ? "إلغاء" : "Cancel", style: "cancel" },
                    {
                      text: isRTL ? "خروج" : "Log out",
                      style: "destructive",
                      onPress: () => {
                        logout();
                        router.replace("/welcome");
                      },
                    },
                  ],
                )
              }
              style={[
                styles.actionBtn,
                styles.logoutBtn,
                { borderColor: colors.border, flexDirection: dir },
              ]}
            >
              <LogOut size={16} color="#ef4444" />
              <Text style={styles.logoutText}>{isRTL ? "تسجيل الخروج" : "Log out"}</Text>
            </Pressable>
          ) : null}
        </SafeAreaView>
        </>
      )}
    </View>
  );
}

function SectionCard({
  title,
  children,
  colors,
  textAlign,
}: {
  title: string;
  children: React.ReactNode;
  colors: ReturnType<typeof useColors>;
  textAlign: "left" | "right";
}) {
  return (
    <View
      style={[
        styles.sectionCard,
        { backgroundColor: colors.card, borderColor: colors.border },
      ]}
    >
      <Text style={[styles.sectionTitle, { color: colors.foreground, textAlign }]}>
        {title}
      </Text>
      <View style={styles.sectionBody}>{children}</View>
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

function Field({
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
  const textAlign = isRTL ? "right" : "left";

  return (
    <View style={styles.field}>
      {label ? (
        <Text style={[styles.fieldLabel, { color: colors.mutedForeground, textAlign }]}>
          {label}
        </Text>
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
            backgroundColor: editable ? colors.background : colors.muted,
            textAlign,
            textAlignVertical: multiline ? "top" : "center",
          },
        ]}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1 },
  flex: { flex: 1, minHeight: 0 },
  scroll: { flex: 1 },
  scrollContent: {
    paddingHorizontal: 16,
    paddingTop: 12,
    paddingBottom: 16,
    gap: 14,
  },
  profileHeaderCard: {
    alignItems: "center",
    borderWidth: 1,
    borderRadius: 16,
    paddingHorizontal: 20,
    paddingVertical: 22,
    gap: 6,
  },
  avatarWrap: { position: "relative", marginBottom: 4 },
  avatar: {
    width: AVATAR_SIZE,
    height: AVATAR_SIZE,
    borderRadius: AVATAR_SIZE / 2,
    borderWidth: 3,
  },
  avatarBadge: {
    position: "absolute",
    bottom: 2,
    right: 2,
    width: 28,
    height: 28,
    borderRadius: 14,
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 2,
    borderColor: "#fff",
  },
  profileName: {
    fontSize: 20,
    fontWeight: "800",
    lineHeight: 26,
    marginTop: 4,
  },
  profileEmail: {
    fontSize: 14,
    lineHeight: 20,
  },
  avatarHint: {
    fontSize: 12,
    fontWeight: "600",
    marginTop: 2,
  },
  sectionCard: {
    borderWidth: 1,
    borderRadius: 16,
    paddingHorizontal: 16,
    paddingTop: 14,
    paddingBottom: 16,
    gap: 12,
  },
  sectionTitle: {
    fontSize: 15,
    fontWeight: "800",
  },
  sectionBody: {
    gap: 14,
  },
  sectionLink: {
    borderWidth: 1,
    borderRadius: 12,
    paddingVertical: 12,
    paddingHorizontal: 14,
    marginBottom: 12,
  },
  block: {
    gap: 8,
  },
  field: {
    gap: 6,
  },
  fieldLabel: {
    fontSize: 12,
    fontWeight: "700",
  },
  fieldHint: {
    fontSize: 12,
    lineHeight: 17,
    marginBottom: 2,
  },
  input: {
    borderWidth: 1,
    borderRadius: 12,
    paddingHorizontal: 14,
    paddingVertical: 12,
    fontSize: 15,
    minHeight: 46,
  },
  inputMultiline: {
    minHeight: 96,
    paddingTop: 12,
  },
  durationChip: {
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 12,
    borderWidth: 1.5,
  },
  immediateCallRow: {
    alignItems: "center",
    gap: 12,
    marginTop: 12,
  },
  certCard: {
    gap: 10,
    borderWidth: 1,
    borderRadius: 12,
    paddingHorizontal: 12,
    paddingVertical: 12,
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
    paddingVertical: 12,
  },
  signaturePreviewWrap: {
    borderWidth: 1,
    borderRadius: 12,
    padding: 12,
    gap: 10,
    alignItems: "center",
  },
  signaturePreview: {
    width: "100%",
    height: 100,
  },
  signatureClear: {
    alignItems: "center",
    gap: 6,
  },
  actions: {
    gap: 10,
  },
  saveDock: {
    borderTopWidth: StyleSheet.hairlineWidth,
    paddingHorizontal: 16,
    paddingTop: 12,
    paddingBottom: 16,
    gap: 10,
  },
  actionBtn: {
    width: "100%",
    alignSelf: "stretch",
  },
  saveBtn: {
    minHeight: 46,
    borderRadius: 12,
    alignItems: "center",
    justifyContent: "center",
  },
  saveBtnText: { color: "#fff", fontWeight: "800", fontSize: 15 },
  logoutBtn: {
    minHeight: 46,
    borderRadius: 12,
    borderWidth: 1,
    alignItems: "center",
    justifyContent: "center",
    gap: 6,
  },
  logoutText: { color: "#ef4444", fontWeight: "700", fontSize: 14 },
});
