import * as DocumentPicker from "expo-document-picker";
import * as ImagePicker from "expo-image-picker";
import { LinearGradient } from "expo-linear-gradient";
import { router, useLocalSearchParams } from "expo-router";
import {
  Building2,
  Camera,
  Check,
  ChevronDown,
  ChevronUp,
  FileText,
  Stethoscope,
  UserRound,
  X,
} from "lucide-react-native";
import React, { useEffect, useRef, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  Image,
  Platform,
  Pressable,
  StyleSheet,
  Text,
  TextInput,
  View,
} from "react-native";
import { AppTextInput } from "@/components/AppTextInput";

import { AuthFormBody } from "@/components/auth/AuthFormBody";
import { DoctorFeesFields } from "@/components/profile/DoctorFeesFields";
import { AuthLoginBackground } from "@/components/auth/AuthLoginBackground";
import { AuthHomeLink } from "@/components/auth/AuthHomeLink";
import { GoogleAuthButton } from "@/components/auth/GoogleAuthButton";
import { AuthLanguageField } from "@/components/auth/AuthLanguageField";
import { AuthFormError, AuthFormField } from "@/components/auth/AuthFormField";
import { CountrySelectField } from "@/components/auth/CountrySelectField";
import { DoctorSignupMarketField } from "@/components/auth/DoctorSignupMarketField";
import { SpecialitySelectField } from "@/components/auth/SpecialitySelectField";
import {
  DEFAULT_PATIENT_COUNTRY,
  PATIENT_COUNTRY_CODES,
  type DoctorSignupCountryCode,
  type PatientCountryCode,
} from "@/constants/patientCountries";
import { defaultDoctorFeeFormValues, feeValue } from "@/domains/doctor/fees";
import { fetchSpecialities, type Speciality } from "@/domains/home/api";
import { getPostAuthRoute } from "@/domains/auth/navigation";
import { useAuthStore } from "@/domains/auth/store";
import type { SignupFile, SignupRole } from "@/domains/auth/types";
import { DOCTOR_APPLY_ROUTE } from "@/constants/doctorSignup";
import {
  hasFieldErrors,
  validateSignupFields,
  type SignupFieldErrors,
} from "@/domains/auth/validation";
import {
  getDoctorSignupMarket,
  setDoctorSignupMarketOverride,
} from "@/domains/market/doctorSignupMarket";
import { getUrlMarketCountry } from "@/domains/market/resolveMarketCountry";
import { useAccentGradient, useColors } from "@/hooks/useColors";
import { useI18n } from "@/hooks/useI18n";
import { useWebLayout } from "@/hooks/useWebLayout";
import { WEB_MOBILE_AUTH_SIGNUP_EXTRA_BOTTOM_PADDING } from "@/constants/webLayout";

type LocalFile = SignupFile & { label: string };

function initialSignupCountry(): PatientCountryCode {
  return getUrlMarketCountry() ?? DEFAULT_PATIENT_COUNTRY;
}

export default function SignupScreen() {
  const colors = useColors();
  const accentGradient = useAccentGradient();
  const { t, isRTL } = useI18n();
  const { isDesktop, isMobile } = useWebLayout();
  const signup = useAuthStore((s) => s.signup);
  const loading = useAuthStore((s) => s.loading);
  const {
    role: roleParam,
    error: errorParam,
    email: emailParam,
    name: nameParam,
  } = useLocalSearchParams<{
    role?: string;
    error?: string;
    email?: string;
    name?: string;
  }>();

  const [role, setRole] = useState<SignupRole>("patient");
  const [name, setName] = useState(nameParam ?? "");
  const [email, setEmail] = useState(emailParam ?? "");
  const [phone, setPhone] = useState("");
  const [password, setPassword] = useState("");
  const [photo, setPhoto] = useState<SignupFile | null>(null);
  const [photoPreview, setPhotoPreview] = useState<string | null>(null);
  const [graduationCert, setGraduationCert] = useState<LocalFile | null>(null);
  const [workPermit, setWorkPermit] = useState<LocalFile | null>(null);
  const [specialities, setSpecialities] = useState<Speciality[]>([]);
  const [specialityId, setSpecialityId] = useState<string>("");
  const initialDoctorMarket = getDoctorSignupMarket() ?? "EG";
  const initialDoctorFees = defaultDoctorFeeFormValues(initialDoctorMarket);
  const [doctorMarket, setDoctorMarket] = useState<DoctorSignupCountryCode>(initialDoctorMarket);
  const [textPriceLocal, setTextPriceLocal] = useState(initialDoctorFees.textLocal);
  const [textPriceUsd, setTextPriceUsd] = useState(initialDoctorFees.textUsd);
  const [videoPriceLocal, setVideoPriceLocal] = useState(initialDoctorFees.videoLocal);
  const [videoPriceUsd, setVideoPriceUsd] = useState(initialDoctorFees.videoUsd);
  const [paymentLink, setPaymentLink] = useState("");
  const [country, setCountry] = useState<PatientCountryCode>(initialSignupCountry);
  const [medicalRecordsConsent, setMedicalRecordsConsent] = useState(false);
  const [hospitalLocation, setHospitalLocation] = useState("");
  const [hospitalDescription, setHospitalDescription] = useState("");
  const [formOpen, setFormOpen] = useState(true);
  const googleNoAccount = errorParam === "google_no_account";
  const [fieldErrors, setFieldErrors] = useState<SignupFieldErrors>({});
  const [formError, setFormError] = useState<string | null>(null);
  const emailRef = useRef<TextInput>(null);
  const phoneRef = useRef<TextInput>(null);
  const passwordRef = useRef<TextInput>(null);

  useEffect(() => {
    if (roleParam === "doctor") {
      router.replace(DOCTOR_APPLY_ROUTE);
    }
  }, [roleParam]);

  useEffect(() => {
    if (!emailParam && !nameParam) return;
    if (emailParam) setEmail(String(emailParam));
    if (nameParam) setName(String(nameParam));
    if (errorParam === "google_no_account") setFormOpen(true);
  }, [emailParam, nameParam, errorParam]);

  const isDoctor = role === "doctor";
  const isHospital = role === "hospital";
  const urlMarket = getUrlMarketCountry();
  const phonePlaceholder =
    urlMarket === "JO" ||
    (isDoctor && getDoctorSignupMarket() === "JO") ||
    (!isDoctor && country === "JO")
      ? t.auth.phonePlaceholderJordan
      : t.auth.phonePlaceholder;

  const applyDoctorMarket = (market: DoctorSignupCountryCode) => {
    setDoctorMarket(market);
    const fees = defaultDoctorFeeFormValues(market);
    setTextPriceLocal(fees.textLocal);
    setTextPriceUsd(fees.textUsd);
    setVideoPriceLocal(fees.videoLocal);
    setVideoPriceUsd(fees.videoUsd);
  };

  useEffect(() => {
    if (!isDoctor) return;
    void fetchSpecialities()
      .then(setSpecialities)
      .catch(() => setSpecialities([]));
  }, [isDoctor]);
  const dir = isRTL ? "row-reverse" : "row";
  const isWeb = Platform.OS === "web";
  const showTitle = true;
  const showSubtitle = !(isWeb && isDesktop);
  const showWebTopBar = isWeb;

  const pickPhoto = () => {
    Alert.alert(t.auth.profilePhoto, t.auth.chooseSource, [
        {
          text: t.auth.camera,
          onPress: async () => {
            const { status } = await ImagePicker.requestCameraPermissionsAsync();
            if (status !== "granted") return;
            const result = await ImagePicker.launchCameraAsync({
              mediaTypes: ["images"],
              allowsEditing: true,
              aspect: [1, 1],
              quality: 0.85,
            });
            if (!result.canceled && result.assets[0]) {
              const asset = result.assets[0];
              setPhotoPreview(asset.uri);
              setPhoto({
                uri: asset.uri,
                mimeType: asset.mimeType ?? "image/jpeg",
                fileName: asset.fileName ?? `avatar-${Date.now()}.jpg`,
              });
            }
          },
        },
        {
          text: t.auth.gallery,
          onPress: async () => {
            const result = await ImagePicker.launchImageLibraryAsync({
              mediaTypes: ["images"],
              allowsEditing: true,
              aspect: [1, 1],
              quality: 0.85,
            });
            if (!result.canceled && result.assets[0]) {
              const asset = result.assets[0];
              setPhotoPreview(asset.uri);
              setPhoto({
                uri: asset.uri,
                mimeType: asset.mimeType ?? "image/jpeg",
                fileName: asset.fileName ?? `avatar-${Date.now()}.jpg`,
              });
            }
          },
        },
        { text: t.common.cancel, style: "cancel" },
      ],
    );
  };

  const pickDocument = async (
    kind: "graduationCert" | "workPermit",
    label: string,
  ) => {
    Alert.alert(label, t.auth.chooseFileType, [
      {
        text: t.auth.photo,
        onPress: async () => {
          const result = await ImagePicker.launchImageLibraryAsync({
            mediaTypes: ["images"],
            quality: 0.9,
          });
          if (!result.canceled && result.assets[0]) {
            const asset = result.assets[0];
            const file: LocalFile = {
              uri: asset.uri,
              mimeType: asset.mimeType ?? "image/jpeg",
              fileName: asset.fileName ?? `${kind}-${Date.now()}.jpg`,
              label,
            };
            if (kind === "graduationCert") setGraduationCert(file);
            else setWorkPermit(file);
          }
        },
      },
      {
        text: "PDF",
        onPress: async () => {
          const result = await DocumentPicker.getDocumentAsync({
            type: "application/pdf",
            copyToCacheDirectory: true,
          });
          if (!result.canceled && result.assets[0]) {
            const asset = result.assets[0];
            const file: LocalFile = {
              uri: asset.uri,
              mimeType: asset.mimeType ?? "application/pdf",
              fileName: asset.name,
              label,
            };
            if (kind === "graduationCert") setGraduationCert(file);
            else setWorkPermit(file);
          }
        },
      },
      { text: t.common.cancel, style: "cancel" },
    ]);
  };

  const submit = async () => {
    const doctorCountry = isDoctor ? getDoctorSignupMarket() ?? undefined : country;
    const errors = validateSignupFields(
      {
        name,
        email,
        phone,
        password,
        isDoctor,
        isHospital,
        specialityId,
        country: doctorCountry,
        medicalRecordsStorageConsent: medicalRecordsConsent,
      },
      t.auth,
    );
    if (hasFieldErrors(errors)) {
      setFieldErrors(errors);
      setFormError(null);
      return;
    }

    setFieldErrors({});
    setFormError(null);

    try {
      await signup({
        role,
        name: name.trim(),
        email: email.trim(),
        phone: phone.trim(),
        password,
        photo: photo ?? undefined,
        graduationCert: isDoctor ? graduationCert ?? undefined : undefined,
        workPermit: isDoctor ? workPermit ?? undefined : undefined,
        specialityId: isDoctor ? specialityId : undefined,
        textPriceLocal: isDoctor ? feeValue(textPriceLocal) : undefined,
        textPriceUsd: isDoctor ? feeValue(textPriceUsd) : undefined,
        videoPriceLocal: isDoctor ? feeValue(videoPriceLocal) : undefined,
        videoPriceUsd: isDoctor ? feeValue(videoPriceUsd) : undefined,
        paymentLink: isDoctor ? paymentLink.trim() : undefined,
        country: isHospital ? undefined : doctorCountry,
        location: isHospital ? hospitalLocation.trim() : undefined,
        description: isHospital ? hospitalDescription.trim() : undefined,
        medicalRecordsStorageConsent: isDoctor || isHospital ? undefined : medicalRecordsConsent,
      });
      const { role: nextRole, doctorApprovalStatus } = useAuthStore.getState();
      router.replace(getPostAuthRoute(nextRole, doctorApprovalStatus));
    } catch (e) {
      setFormError((e as Error).message || t.auth.genericError);
    }
  };

  const screen = (
    <View
      style={[
        styles.screen,
        { backgroundColor: "transparent" },
        Platform.OS === "web" && styles.screenWeb,
      ]}
    >
      {showWebTopBar ? (
        <View
          style={[
            styles.topBar,
            {
              paddingTop: 8,
              flexDirection: dir,
            },
          ]}
        >
          <AuthHomeLink compact />
          <AuthLanguageField />
        </View>
      ) : null}

      <AuthFormBody
        style={styles.flex}
        contentContainerStyle={[
          styles.body,
          Platform.OS !== "web" && styles.bodyNative,
          Platform.OS === "web" && isMobile && styles.bodyMobileWeb,
        ]}
        bottomOffset={32}
      >
        {showTitle ? (
          <Text
            style={[
              styles.title,
              {
                color: colors.foreground,
                alignSelf: isRTL ? "flex-end" : "flex-start",
                width: "100%",
                textAlign: isRTL ? "right" : "left",
              },
            ]}
          >
            {t.auth.createAccountTitle}
          </Text>
        ) : null}
        {showSubtitle ? (
          <Text style={[styles.sub, { color: colors.mutedForeground }]}>
            {t.auth.createAccountSubtitle}
          </Text>
        ) : null}

        {googleNoAccount ? (
          <AuthFormError
            message={
              isRTL
                ? "لا يوجد حساب مرتبط بحساب Google هذا. أنشئ حساباً للمتابعة."
                : "No 3elagi account is linked to that Google account. Create one to continue."
            }
            colors={colors}
          />
        ) : null}

        <View
          style={[
            styles.roleRow,
            {
              flexDirection: dir,
              marginTop:
                Platform.OS === "web" ? (showSubtitle ? 20 : 16) : showSubtitle ? 10 : 6,
            },
          ]}
        >
          <RoleChip
            active={role === "patient"}
            onPress={() => {
              setRole("patient");
              setDoctorSignupMarketOverride(null);
              setFieldErrors((prev) => ({ ...prev, medicalRecordsConsent: undefined }));
            }}
            label={t.auth.patient}
            Icon={UserRound}
            colors={colors}
          />
          <RoleChip
            active={role === "doctor"}
            onPress={() => router.push(DOCTOR_APPLY_ROUTE)}
            label={t.auth.doctor}
            Icon={Stethoscope}
            colors={colors}
          />
          <RoleChip
            active={isHospital}
            onPress={() => {
              setRole("hospital");
              setFieldErrors({});
            }}
            label={t.surgery.hospital}
            Icon={Building2}
            colors={colors}
          />
        </View>

        {!isHospital ? <GoogleAuthButton dividerBelow signupRole="patient" /> : null}

        <Pressable
          onPress={() => setFormOpen((open) => !open)}
          accessibilityRole="button"
          accessibilityState={{ expanded: formOpen }}
          style={[styles.formToggle, { borderColor: colors.border, flexDirection: dir }]}
        >
          <Text style={{ color: colors.foreground, fontWeight: "700", flex: 1, textAlign: isRTL ? "right" : "left" }}>
            {isRTL ? "التسجيل بالبريد الإلكتروني" : "Sign up with email"}
          </Text>
          {formOpen ? (
            <ChevronUp size={18} color={colors.mutedForeground} />
          ) : (
            <ChevronDown size={18} color={colors.mutedForeground} />
          )}
        </Pressable>

        {/* Collapsed by default, and inert until consent is given — the form
            writes medical data, so it stays dimmed until then. */}
        <View
          style={[styles.collapsibleForm, { display: formOpen ? "flex" : "none" }]}
        >
        <Pressable onPress={pickPhoto} style={styles.avatarWrap}>
          {photoPreview ? (
            <Image source={{ uri: photoPreview }} style={styles.avatar} />
          ) : (
            <View style={[styles.avatar, styles.avatarPlaceholder, { backgroundColor: colors.muted }]}>
              <Camera size={28} color={colors.mutedForeground} />
            </View>
          )}
          <View style={[styles.cameraBadge, { backgroundColor: colors.primary }]}>
            <Camera size={13} color="#fff" />
          </View>
        </Pressable>

        <View style={{ width: "100%", gap: 12, marginTop: 20 }}>
          {formError ? <AuthFormError message={formError} colors={colors} /> : null}
          <AuthFormField
            label={isHospital ? t.surgery.hospitalName : t.auth.name}
            value={name}
            onChange={(value) => {
              setName(value);
              if (fieldErrors.name) setFieldErrors((prev) => ({ ...prev, name: undefined }));
              if (formError) setFormError(null);
            }}
            error={fieldErrors.name}
            placeholder={t.auth.namePlaceholder}
            returnKeyType="next"
            blurOnSubmit={false}
            onSubmitEditing={() => emailRef.current?.focus()}
            colors={colors}
            isRTL={isRTL}
          />
          <AuthFormField
            ref={emailRef}
            label={t.auth.email}
            value={email}
            onChange={(value) => {
              setEmail(value);
              if (fieldErrors.email) setFieldErrors((prev) => ({ ...prev, email: undefined }));
              if (formError) setFormError(null);
            }}
            error={fieldErrors.email}
            placeholder={t.auth.emailPlaceholder}
            autoCapitalize="none"
            keyboardType="email-address"
            returnKeyType="next"
            blurOnSubmit={false}
            onSubmitEditing={() => phoneRef.current?.focus()}
            colors={colors}
            isRTL={isRTL}
          />
          <AuthFormField
            ref={phoneRef}
            label={t.auth.phone}
            value={phone}
            onChange={(value) => {
              setPhone(value);
              if (fieldErrors.phone) setFieldErrors((prev) => ({ ...prev, phone: undefined }));
              if (formError) setFormError(null);
            }}
            error={fieldErrors.phone}
            placeholder={phonePlaceholder}
            keyboardType="phone-pad"
            returnKeyType="next"
            blurOnSubmit={false}
            onSubmitEditing={() => passwordRef.current?.focus()}
            colors={colors}
            isRTL={isRTL}
          />
          <AuthFormField
            ref={passwordRef}
            label={t.auth.password}
            value={password}
            onChange={(value) => {
              setPassword(value);
              if (fieldErrors.password) setFieldErrors((prev) => ({ ...prev, password: undefined }));
              if (formError) setFormError(null);
            }}
            error={fieldErrors.password}
            placeholder={t.auth.passwordMinPlaceholder}
            secure
            returnKeyType="go"
            onSubmitEditing={() => {
              if (!loading) void submit();
            }}
            colors={colors}
            isRTL={isRTL}
          />

          {isHospital ? (
            <View style={{ gap: 12, width: "100%" }}>
              <AuthFormField
                label={t.surgery.location}
                value={hospitalLocation}
                onChange={setHospitalLocation}
                placeholder={t.surgery.location}
                colors={colors}
                isRTL={isRTL}
              />
              <AuthFormField
                label={t.surgery.description}
                value={hospitalDescription}
                onChange={setHospitalDescription}
                placeholder={t.surgery.description}
                colors={colors}
                isRTL={isRTL}
              />
            </View>
          ) : null}

          {isHospital ? null : !isDoctor ? (
            <CountrySelectField
              label={t.auth.countryOfResidence}
              value={country}
              codes={PATIENT_COUNTRY_CODES}
              onChange={(code) => {
                setCountry(code);
                if (fieldErrors.country) {
                  setFieldErrors((prev) => ({ ...prev, country: undefined }));
                }
              }}
              error={fieldErrors.country}
              isRTL={isRTL}
              disabled={loading}
            />
          ) : (
            <DoctorSignupMarketField
              isRTL={isRTL}
              disabled={loading}
              error={fieldErrors.country}
              onMarketChange={(market) => {
                if (market) applyDoctorMarket(market);
                if (fieldErrors.country) {
                  setFieldErrors((prev) => ({ ...prev, country: undefined }));
                }
              }}
            />
          )}

          {isDoctor && (
            <View style={{ gap: 12, marginTop: 4 }}>
              <SpecialitySelectField
                label={t.auth.speciality}
                value={specialityId}
                onChange={(id) => {
                  setSpecialityId(id);
                  if (fieldErrors.specialityId) {
                    setFieldErrors((prev) => ({ ...prev, specialityId: undefined }));
                  }
                }}
                specialities={specialities}
                error={fieldErrors.specialityId}
                disabled={loading}
              />
              <Text style={[styles.sectionLabel, { color: colors.foreground }]}>
                {isRTL ? "أسعار الاستشارة" : "Consultation prices"}
              </Text>
              <DoctorFeesFields
                country={doctorMarket}
                textLocal={textPriceLocal}
                onTextLocal={setTextPriceLocal}
                textUsd={textPriceUsd}
                onTextUsd={setTextPriceUsd}
                videoLocal={videoPriceLocal}
                onVideoLocal={setVideoPriceLocal}
                videoUsd={videoPriceUsd}
                onVideoUsd={setVideoPriceUsd}
                paymentLink={paymentLink}
                onPaymentLink={setPaymentLink}
                disabled={loading}
              />
              <Text style={[styles.sectionLabel, { color: colors.foreground }]}>
                {t.auth.documentsOptional}
              </Text>
              <DocUploadRow
                label={t.auth.graduationCert}
                file={graduationCert}
                onPick={() => pickDocument("graduationCert", t.auth.graduationCert)}
                onClear={() => setGraduationCert(null)}
                colors={colors}
                dir={dir}
                notUploadedLabel={t.auth.notUploadedOptional}
                uploadLabel={t.auth.upload}
              />
              <DocUploadRow
                label={t.auth.workLicense}
                file={workPermit}
                onPick={() => pickDocument("workPermit", t.auth.workLicense)}
                onClear={() => setWorkPermit(null)}
                colors={colors}
                dir={dir}
                notUploadedLabel={t.auth.notUploadedOptional}
                uploadLabel={t.auth.upload}
              />
            </View>
          )}

          {!isDoctor && !isHospital ? (
            <View style={{ gap: 6, width: "100%" }}>
              <Pressable
                accessibilityRole="checkbox"
                accessibilityState={{ checked: medicalRecordsConsent }}
                onPress={() => {
                  setMedicalRecordsConsent((prev) => !prev);
                  if (fieldErrors.medicalRecordsConsent) {
                    setFieldErrors((prev) => ({ ...prev, medicalRecordsConsent: undefined }));
                  }
                  if (formError) setFormError(null);
                }}
                style={[styles.consentRow, { flexDirection: dir, alignItems: "flex-start" }]}
              >
                <View
                  style={[
                    styles.consentBox,
                    {
                      borderColor: fieldErrors.medicalRecordsConsent
                        ? colors.destructive
                        : medicalRecordsConsent
                          ? colors.primary
                          : colors.border,
                      backgroundColor: medicalRecordsConsent ? colors.primary : colors.card,
                    },
                  ]}
                >
                  {medicalRecordsConsent ? (
                    <Check size={14} color="#fff" strokeWidth={3} />
                  ) : null}
                </View>
                <Text
                  style={[
                    styles.consentText,
                    { color: colors.foreground, textAlign: isRTL ? "right" : "left" },
                  ]}
                >
                  {t.auth.medicalRecordsConsentLabel}
                </Text>
              </Pressable>
              {fieldErrors.medicalRecordsConsent ? (
                <Text style={{ color: colors.destructive, fontSize: 12, fontWeight: "600" }}>
                  {fieldErrors.medicalRecordsConsent}
                </Text>
              ) : null}
            </View>
          ) : null}

          <Pressable
            onPress={submit}
            disabled={loading}
            style={({ pressed }) => [
              styles.btn,
              {
                shadowColor: colors.primary,
                opacity: loading ? 0.7 : pressed ? 0.92 : 1,
              },
            ]}
          >
            <LinearGradient
              colors={loading ? ["#94A3B8", "#94A3B8"] : accentGradient}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 1 }}
              style={styles.btnGradient}
            >
              {loading ? (
                <ActivityIndicator color="#fff" />
              ) : (
                <Text style={styles.btnText}>{t.auth.signUp}</Text>
              )}
            </LinearGradient>
          </Pressable>
        </View>

          <Pressable
            onPress={() => {
              if (Platform.OS === "web") {
                router.replace("/auth/login");
                return;
              }
              router.replace({ pathname: "/welcome", params: { panel: "login" } });
            }}
            style={{ paddingVertical: 8, alignItems: "center" }}
          >
            <Text style={{ color: colors.primary, fontWeight: "600" }}>
              {t.auth.hasAccountLogIn}
            </Text>
          </Pressable>
          {Platform.OS === "web" ? (
            <View style={{ alignItems: "center" }}>
              <AuthHomeLink />
            </View>
          ) : null}
        </View>
      </AuthFormBody>
    </View>
  );

  if (Platform.OS === "web") {
    return screen;
  }

  return <AuthLoginBackground>{screen}</AuthLoginBackground>;
}

function RoleChip({
  active,
  onPress,
  label,
  Icon,
  colors,
}: {
  active: boolean;
  onPress: () => void;
  label: string;
  Icon: typeof UserRound;
  colors: ReturnType<typeof useColors>;
}) {
  return (
    <Pressable
      onPress={onPress}
      style={[
        styles.roleChip,
        {
          backgroundColor: active ? colors.primary : colors.card,
          borderColor: active ? colors.primary : colors.border,
        },
      ]}
    >
      <Icon size={18} color={active ? "#fff" : colors.foreground} />
      <Text style={{ color: active ? "#fff" : colors.foreground, fontWeight: "700" }}>
        {label}
      </Text>
    </Pressable>
  );
}

function DocUploadRow({
  label,
  file,
  onPick,
  onClear,
  colors,
  dir,
  notUploadedLabel,
  uploadLabel,
}: {
  label: string;
  file: LocalFile | null;
  onPick: () => void;
  onClear: () => void;
  colors: ReturnType<typeof useColors>;
  dir: "row" | "row-reverse";
  notUploadedLabel: string;
  uploadLabel: string;
}) {
  return (
    <View style={[styles.docRow, { borderColor: colors.border, backgroundColor: colors.card, flexDirection: dir }]}>
      <FileText size={20} color={colors.primary} />
      <View style={{ flex: 1, gap: 2 }}>
        <Text style={{ color: colors.foreground, fontWeight: "600", fontSize: 14 }}>{label}</Text>
        <Text style={{ color: colors.mutedForeground, fontSize: 12 }} numberOfLines={1}>
          {file ? file.fileName : notUploadedLabel}
        </Text>
      </View>
      {file ? (
        <Pressable onPress={onClear} hitSlop={8}>
          <X size={18} color={colors.mutedForeground} />
        </Pressable>
      ) : (
        <Pressable onPress={onPick}>
          <Text style={{ color: colors.primary, fontWeight: "700", fontSize: 13 }}>
            {uploadLabel}
          </Text>
        </Pressable>
      )}
    </View>
  );
}

const AVATAR_SIZE = 90;

const styles = StyleSheet.create({
  // Content-sized on native: the auth card hugs the form, the shell scrolls.
  screen: { flexShrink: 1 },
  flex: { flex: 1 },
  screenWeb: { flex: 0, width: "100%", height: "auto" },
  topBar: {
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 12,
  },
  body: {
    paddingHorizontal: Platform.OS === "web" ? 24 : 16,
    paddingTop: 12,
    alignItems: "center",
    paddingBottom: Platform.OS === "web" ? 40 : 40,
  },
  bodyNative: {
    paddingTop: 4,
    paddingBottom: 12,
  },
  bodyMobileWeb: {
    paddingHorizontal: 16,
    paddingTop: 8,
    paddingBottom: 40 + WEB_MOBILE_AUTH_SIGNUP_EXTRA_BOTTOM_PADDING,
  },
  title: { fontSize: Platform.OS === "web" ? 28 : 24, fontWeight: "800" },
  sub: { fontSize: 14, marginTop: 4, textAlign: "center" },
  roleRow: { gap: 10, width: "100%" },
  roleChip: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    paddingVertical: 12,
    borderRadius: 12,
    borderWidth: 1.5,
  },
  avatarWrap: {
    marginTop: Platform.OS === "web" ? 24 : 14,
    width: AVATAR_SIZE,
    height: AVATAR_SIZE,
    // The collapsible wrapper now stretches full width, so the avatar needs to
    // centre itself rather than inheriting the old shrink-wrapped alignment.
    alignSelf: "center",
    position: "relative",
  },
  avatar: {
    width: AVATAR_SIZE,
    height: AVATAR_SIZE,
    borderRadius: AVATAR_SIZE / 2,
  },
  avatarPlaceholder: { alignItems: "center", justifyContent: "center" },
  cameraBadge: {
    position: "absolute",
    bottom: 0,
    right: 0,
    width: 28,
    height: 28,
    borderRadius: 14,
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 2,
    borderColor: "#fff",
  },
  sectionLabel: { fontSize: 14, fontWeight: "800" },
  docRow: {
    alignItems: "center",
    gap: 10,
    padding: 12,
    borderRadius: 12,
    borderWidth: 1,
  },
  consentRow: {
    gap: 10,
    marginTop: 4,
  },
  consentBox: {
    width: 22,
    height: 22,
    borderRadius: 6,
    borderWidth: 1.5,
    alignItems: "center",
    justifyContent: "center",
    marginTop: 2,
  },
  consentText: {
    flex: 1,
    fontSize: 13,
    lineHeight: 19,
    fontWeight: "500",
  },
  label: { fontSize: 13, fontWeight: "700" },
  input: {
    borderRadius: 12,
    borderWidth: 1,
    paddingHorizontal: 14,
    paddingVertical: 12,
    fontSize: 15,
  },
  btn: {
    marginTop: 8,
    borderRadius: 14,
    overflow: "hidden",
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.3,
    shadowRadius: 12,
    elevation: 5,
  },
  btnGradient: {
    paddingVertical: 15,
    alignItems: "center",
    justifyContent: "center",
  },
  collapsibleForm: {
    width: "100%",
    alignSelf: "stretch",
  },
  formToggle: {
    width: "100%",
    alignSelf: "stretch",
    alignItems: "center",
    gap: 8,
    marginTop: Platform.OS === "web" ? 14 : 8,
    paddingHorizontal: 14,
    paddingVertical: 12,
    borderWidth: 1,
    borderRadius: 12,
  },
  btnText: { color: "#fff", fontWeight: "800", fontSize: 15, letterSpacing: 0.2 },
});
