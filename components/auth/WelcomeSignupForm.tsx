import * as DocumentPicker from "expo-document-picker";
import * as ImagePicker from "expo-image-picker";
import { LinearGradient } from "expo-linear-gradient";
import { router, useLocalSearchParams } from "expo-router";
import { Building2, Camera, Check, FileText, Stethoscope, UserRound, X } from "lucide-react-native";
import React, { useEffect, useRef, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  Image,
  Pressable,
  StyleSheet,
  Text,
  TextInput,
  View,
} from "react-native";
import { AppTextInput } from "@/components/AppTextInput";
import { DoctorFeesFields } from "@/components/profile/DoctorFeesFields";
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
import { authRepository } from "@/domains/auth/repository";
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
import { flexRow } from "@/utils/rtl";
import { GoogleAuthButton } from "@/components/auth/GoogleAuthButton";
import type { GoogleNoAccountPayload } from "@/domains/auth/googleAuthFlow";

type LocalFile = SignupFile & { label: string };

interface Props {
  onSwitchToLogin: () => void;
  googlePrefill?: GoogleNoAccountPayload | null;
  onGoogleNoAccount?: (payload: GoogleNoAccountPayload) => void;
  /** Admin panel: create a doctor without replacing the admin session. */
  adminDoctorMode?: boolean;
  onAdminDoctorCreated?: () => void;
}

function initialSignupCountry(): PatientCountryCode {
  return getUrlMarketCountry() ?? DEFAULT_PATIENT_COUNTRY;
}

export function WelcomeSignupForm({
  onSwitchToLogin,
  googlePrefill,
  onGoogleNoAccount,
  adminDoctorMode = false,
  onAdminDoctorCreated,
}: Props) {
  const colors = useColors();
  const accentGradient = useAccentGradient();
  const { t, isRTL } = useI18n();
  const { role: roleParam } = useLocalSearchParams<{ role?: string }>();
  const dir = flexRow(isRTL);
  const signup = useAuthStore((s) => s.signup);
  const loading = useAuthStore((s) => s.loading);

  const [role, setRole] = useState<SignupRole>(adminDoctorMode ? "doctor" : "patient");
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");
  const [password, setPassword] = useState("");
  const [photo, setPhoto] = useState<SignupFile | null>(null);
  const [photoPreview, setPhotoPreview] = useState<string | null>(null);
  const [graduationCert, setGraduationCert] = useState<LocalFile | null>(null);
  const [workPermit, setWorkPermit] = useState<LocalFile | null>(null);
  const [specialities, setSpecialities] = useState<Speciality[]>([]);
  const [specialityId, setSpecialityId] = useState("");
  const initialDoctorMarket = getDoctorSignupMarket() ?? "EG";
  const initialDoctorFees = defaultDoctorFeeFormValues(initialDoctorMarket);
  const [doctorMarket, setDoctorMarket] = useState<DoctorSignupCountryCode>(initialDoctorMarket);
  const [textPriceLocal, setTextPriceLocal] = useState(initialDoctorFees.textLocal);
  const [textPriceUsd, setTextPriceUsd] = useState(initialDoctorFees.textUsd);
  const [videoPriceLocal, setVideoPriceLocal] = useState(initialDoctorFees.videoLocal);
  const [videoPriceUsd, setVideoPriceUsd] = useState(initialDoctorFees.videoUsd);
  const [paymentLink, setPaymentLink] = useState("");
  const [clinicLocation, setClinicLocation] = useState("");
  const [country, setCountry] = useState<PatientCountryCode>(initialSignupCountry);
  const [medicalRecordsConsent, setMedicalRecordsConsent] = useState(false);
  const [hospitalLocation, setHospitalLocation] = useState("");
  const [hospitalDescription, setHospitalDescription] = useState("");
  const [fieldErrors, setFieldErrors] = useState<SignupFieldErrors>({});
  const [formError, setFormError] = useState<string | null>(null);
  const [adminSubmitting, setAdminSubmitting] = useState(false);
  const emailRef = useRef<TextInput>(null);
  const phoneRef = useRef<TextInput>(null);

  useEffect(() => {
    if (adminDoctorMode) return;
    if (roleParam === "doctor") {
      router.replace(DOCTOR_APPLY_ROUTE);
    }
  }, [roleParam, adminDoctorMode]);

  useEffect(() => {
    if (!googlePrefill || adminDoctorMode) return;
    if (googlePrefill.email) setEmail(googlePrefill.email);
    if (googlePrefill.name) setName(googlePrefill.name);
    if (googlePrefill.role === "doctor" || googlePrefill.role === "patient") {
      setRole(googlePrefill.role === "doctor" && !adminDoctorMode ? "patient" : googlePrefill.role);
    }
  }, [googlePrefill, adminDoctorMode]);
  const passwordRef = useRef<TextInput>(null);

  const isDoctor = adminDoctorMode || role === "doctor";
  const isHospital = !adminDoctorMode && role === "hospital";
  const busy = loading || adminSubmitting;
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
    ]);
  };

  const pickDocument = async (kind: "graduationCert" | "workPermit", label: string) => {
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
      const payload = {
        role: (adminDoctorMode ? "doctor" : role) as SignupRole,
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
        clinicLocation: isDoctor ? clinicLocation.trim() || undefined : undefined,
        medicalRecordsStorageConsent: isDoctor || isHospital ? undefined : medicalRecordsConsent,
      };

      if (adminDoctorMode) {
        setAdminSubmitting(true);
        const adminSession = {
          profile: useAuthStore.getState().profile,
          accessToken: useAuthStore.getState().accessToken,
          refreshToken: useAuthStore.getState().refreshToken,
          role: useAuthStore.getState().role,
          doctorId: useAuthStore.getState().doctorId,
          specialty: useAuthStore.getState().specialty,
          specialityId: useAuthStore.getState().specialityId,
          doctorApprovalStatus: useAuthStore.getState().doctorApprovalStatus,
          emailVerified: useAuthStore.getState().emailVerified,
        };
        const adminToken = adminSession.accessToken;
        if (!adminToken) {
          throw new Error("Admin session expired. Please log in again.");
        }
        await authRepository.createAdminDoctor(adminToken, payload);
        useAuthStore.setState({ ...adminSession, loading: false, error: null });
        onAdminDoctorCreated?.();
        return;
      }

      await signup(payload);
      const { role: nextRole, doctorApprovalStatus } = useAuthStore.getState();
      router.replace(getPostAuthRoute(nextRole, doctorApprovalStatus));
    } catch (e) {
      setFormError((e as Error).message || t.auth.genericError);
    } finally {
      setAdminSubmitting(false);
    }
  };

  return (
    <View style={styles.form}>
      {!adminDoctorMode ? (
        <View style={[styles.roleRow, { flexDirection: dir }]}>
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
            active={false}
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
      ) : null}

      {!adminDoctorMode && !isHospital ? (
        <GoogleAuthButton
          dividerBelow
          signupRole="patient"
          onAccountNotFound={onGoogleNoAccount}
        />
      ) : null}

      {!adminDoctorMode && googlePrefill?.email ? (
        <AuthFormError
          message={
            isRTL
              ? "لا يوجد حساب مرتبط بحساب Google هذا. أكمل التسجيل أدناه."
              : "No 3elagi account is linked to that Google account. Finish signing up below."
          }
          colors={colors}
        />
      ) : null}

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
          disabled={busy}
        />
      ) : (
        <DoctorSignupMarketField
          isRTL={isRTL}
          disabled={busy}
          error={fieldErrors.country}
          onMarketChange={(market) => {
            if (market) applyDoctorMarket(market);
            if (fieldErrors.country) {
              setFieldErrors((prev) => ({ ...prev, country: undefined }));
            }
          }}
        />
      )}

      {isDoctor ? (
        <AuthFormField
          label={t.auth.clinicLocationOptional}
          value={clinicLocation}
          onChange={setClinicLocation}
          placeholder={t.auth.clinicLocationPlaceholder}
          colors={colors}
          isRTL={isRTL}
        />
      ) : null}

      {isDoctor ? (
        <View style={styles.doctorBlock}>
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
            disabled={busy}
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
            disabled={busy}
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
      ) : null}

      {!isDoctor && !isHospital ? (
        <View style={{ gap: 6 }}>
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
        disabled={busy}
        style={({ pressed }) => [
          styles.btn,
          {
            shadowColor: colors.primary,
            opacity: busy ? 0.7 : pressed ? 0.92 : 1,
          },
        ]}
      >
        <LinearGradient
          colors={busy ? ["#94A3B8", "#94A3B8"] : accentGradient}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
          style={styles.btnGradient}
        >
          {busy ? (
            <ActivityIndicator color="#fff" />
          ) : (
            <Text style={styles.btnText}>
              {adminDoctorMode
                ? isRTL
                  ? "إنشاء حساب طبيب"
                  : "Create doctor account"
                : t.auth.signUp}
            </Text>
          )}
        </LinearGradient>
      </Pressable>

      {!adminDoctorMode ? (
        <Pressable onPress={onSwitchToLogin} style={styles.switchLink}>
          <Text style={{ color: colors.primary, fontWeight: "600" }}>
            {t.auth.hasAccountLogIn}
          </Text>
        </Pressable>
      ) : null}
    </View>
  );
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
    <View
      style={[
        styles.docRow,
        { borderColor: colors.border, backgroundColor: colors.card, flexDirection: dir },
      ]}
    >
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

const AVATAR_SIZE = 80;

const styles = StyleSheet.create({
  form: { width: "100%", gap: 12, alignItems: "center" },
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
    width: AVATAR_SIZE,
    height: AVATAR_SIZE,
    position: "relative",
    marginVertical: 4,
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
  doctorBlock: { width: "100%", gap: 12 },
  sectionLabel: { fontSize: 14, fontWeight: "800" },
  docRow: {
    alignItems: "center",
    gap: 10,
    padding: 12,
    borderRadius: 12,
    borderWidth: 1,
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
    width: "100%",
    borderRadius: 14,
    overflow: "hidden",
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.32,
    shadowRadius: 12,
    elevation: 5,
  },
  btnGradient: {
    paddingVertical: 15,
    alignItems: "center",
    justifyContent: "center",
  },
  btnText: { color: "#fff", fontWeight: "800", fontSize: 15, letterSpacing: 0.2 },
  switchLink: {
    paddingVertical: 8,
    alignItems: "center",
  },
  consentRow: { width: "100%", gap: 10, paddingVertical: 4 },
  consentBox: {
    width: 22,
    height: 22,
    borderRadius: 6,
    borderWidth: 1.5,
    alignItems: "center",
    justifyContent: "center",
    marginTop: 2,
  },
  consentText: { flex: 1, fontSize: 13, lineHeight: 20, fontWeight: "500" },
});
