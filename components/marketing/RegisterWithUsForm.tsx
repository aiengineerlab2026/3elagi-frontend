import { useLocalSearchParams } from "expo-router";
import { Info, Stethoscope, UserRound } from "lucide-react-native";
import * as ImagePicker from "expo-image-picker";
import React, { useEffect, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  Image,
  Platform,
  Pressable,
  StyleSheet,
  Text,
  View,
  type StyleProp,
  type ViewStyle,
} from "react-native";
import { AppTextInput } from "@/components/AppTextInput";
import { DoctorSignupMarketField } from "@/components/auth/DoctorSignupMarketField";
import { SpecialitySelectField } from "@/components/auth/SpecialitySelectField";
import { primaryButton, UI } from "@/constants/uiTokens";
import {
  buildDoctorSignupPhone,
  DEFAULT_PATIENT_COUNTRY,
  doctorSignupDialCode,
  doctorSignupPhonePlaceholder,
  patientCountryLabel,
  type DoctorSignupCountryCode,
} from "@/constants/patientCountries";
import { localFeeCurrency } from "@/components/profile/DoctorFeesFields";
import { defaultDoctorFeeFormValues } from "@/domains/doctor/fees";
import { submitDoctorRegistration, type DoctorRegistrationPhoto } from "@/domains/doctorRegistration/api";
import { hasFieldErrors } from "@/domains/auth/validation";
import { fetchSpecialities, type Speciality } from "@/domains/home/api";
import { useColors } from "@/hooks/useColors";
import { useI18n } from "@/hooks/useI18n";
import { alignText, flexRow } from "@/utils/rtl";
import { showErrorToast, showSuccessToast } from "@/utils/toast";

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

function emailFromQueryParam(raw: string | string[] | undefined): string {
  const value = Array.isArray(raw) ? raw[0] : raw;
  const trimmed = value?.trim().toLowerCase() ?? "";
  return trimmed && EMAIL_RE.test(trimmed) ? trimmed : "";
}

type FieldErrors = {
  doctorName?: string;
  email?: string;
  phone?: string;
  country?: string;
  priceLocal?: string;
  priceUsd?: string;
  specialityId?: string;
  photo?: string;
};

function parsePositivePrice(value: string): number | null {
  const trimmed = value.trim();
  if (!trimmed) return null;
  const parsed = Number(trimmed.replace(/,/g, ""));
  if (!Number.isFinite(parsed) || parsed <= 0) return null;
  return Math.round(parsed * 100) / 100;
}

function resolveRegistrationPrice(value: string, fallback: number): number {
  return parsePositivePrice(value) ?? fallback;
}

type Props = {
  /** Centered hero block above the fields (desktop card). */
  showHero?: boolean;
  style?: StyleProp<ViewStyle>;
};

export function RegisterWithUsForm({ showHero = false, style }: Props) {
  const colors = useColors();
  const { t, isRTL } = useI18n();
  const { email: emailParam } = useLocalSearchParams<{ email?: string | string[] }>();
  const dir = flexRow(isRTL);
  const textAlign = alignText(isRTL);

  const [doctorName, setDoctorName] = useState("");
  const [email, setEmail] = useState(() => emailFromQueryParam(emailParam));
  const [phoneLocal, setPhoneLocal] = useState("");
  const [country, setCountry] = useState<DoctorSignupCountryCode>(DEFAULT_PATIENT_COUNTRY);
  const initialFees = defaultDoctorFeeFormValues(DEFAULT_PATIENT_COUNTRY);
  const [priceLocal, setPriceLocal] = useState(initialFees.textLocal);
  const [priceUsd, setPriceUsd] = useState(initialFees.textUsd);
  const [clinicLocation, setClinicLocation] = useState("");
  const [specialityId, setSpecialityId] = useState("");
  const [photo, setPhoto] = useState<DoctorRegistrationPhoto | null>(null);
  const [photoPreview, setPhotoPreview] = useState<string | null>(null);
  const [specialities, setSpecialities] = useState<Speciality[]>([]);
  const [fieldErrors, setFieldErrors] = useState<FieldErrors>({});
  const [sending, setSending] = useState(false);
  const [sent, setSent] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);

  useEffect(() => {
    void fetchSpecialities()
      .then(setSpecialities)
      .catch(() => setSpecialities([]));
  }, []);

  useEffect(() => {
    const fromUrl = emailFromQueryParam(emailParam);
    if (fromUrl) setEmail(fromUrl);
  }, [emailParam]);

  const pickPhoto = () => {
    if (Platform.OS === "web") {
      void (async () => {
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
            fileName: asset.fileName ?? `doctor-photo-${Date.now()}.jpg`,
          });
          if (fieldErrors.photo) {
            setFieldErrors((prev) => ({ ...prev, photo: undefined }));
          }
        }
      })();
      return;
    }

    Alert.alert(t.registerWithUs.photoLabel, t.auth.chooseFileType, [
      {
        text: t.auth.camera,
        onPress: async () => {
          const result = await ImagePicker.launchCameraAsync({
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
              fileName: asset.fileName ?? `doctor-photo-${Date.now()}.jpg`,
            });
            if (fieldErrors.photo) {
              setFieldErrors((prev) => ({ ...prev, photo: undefined }));
            }
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
              fileName: asset.fileName ?? `doctor-photo-${Date.now()}.jpg`,
            });
            if (fieldErrors.photo) {
              setFieldErrors((prev) => ({ ...prev, photo: undefined }));
            }
          }
        },
      },
      { text: t.common.cancel, style: "cancel" },
    ]);
  };

  const dialCode = doctorSignupDialCode(country);
  const phonePlaceholder = doctorSignupPhonePlaceholder(country, {
    eg: t.registerWithUs.phoneLocalPlaceholderEg,
    jo: t.registerWithUs.phoneLocalPlaceholderJo,
    us: t.registerWithUs.phoneLocalPlaceholderUs,
    gb: t.registerWithUs.phoneLocalPlaceholderGb,
  });
  const homeCurrency = localFeeCurrency(country);
  const homeLabel = patientCountryLabel(country, isRTL);
  const insidePriceLabel = isRTL
    ? `داخل ${homeLabel} (${homeCurrency})`
    : `Inside ${homeLabel} (${homeCurrency})`;
  const outsidePriceLabel = isRTL
    ? `خارج ${homeLabel} (USD)`
    : `Outside ${homeLabel} (USD)`;

  const validate = (): FieldErrors => {
    const errors: FieldErrors = {};
    if (!doctorName.trim()) errors.doctorName = t.auth.fieldRequired;
    const trimmedEmail = email.trim();
    if (!trimmedEmail) errors.email = t.auth.fieldRequired;
    else if (!EMAIL_RE.test(trimmedEmail)) errors.email = t.auth.invalidEmail;
    if (!country) errors.country = t.auth.doctorMarketRequired;
    if (!phoneLocal.replace(/\D/g, "").trim()) errors.phone = t.auth.fieldRequired;
    if (priceLocal.trim() && !parsePositivePrice(priceLocal)) {
      errors.priceLocal = t.registerWithUs.invalidPrice;
    }
    if (priceUsd.trim() && !parsePositivePrice(priceUsd)) {
      errors.priceUsd = t.registerWithUs.invalidPrice;
    }
    if (!specialityId) errors.specialityId = t.auth.specialityRequiredMsg;
    if (!photo) errors.photo = t.registerWithUs.photoRequired;
    return errors;
  };

  const submit = async () => {
    const errors = validate();
    setFieldErrors(errors);
    if (hasFieldErrors(errors)) return;

    setSending(true);
    setSubmitError(null);
    try {
      const defaults = defaultDoctorFeeFormValues(country);
      await submitDoctorRegistration({
        doctorName,
        email,
        phone: buildDoctorSignupPhone(country, phoneLocal),
        country,
        specialityId,
        clinicLocation: clinicLocation.trim() || undefined,
        priceLocal: resolveRegistrationPrice(priceLocal, Number(defaults.textLocal)),
        priceUsd: resolveRegistrationPrice(priceUsd, Number(defaults.textUsd)),
        photo: photo!,
      });
      setSent(true);
      setSubmitError(null);
      showSuccessToast(t.registerWithUs.sent);
      setDoctorName("");
      setEmail("");
      setPhoneLocal("");
      setCountry(DEFAULT_PATIENT_COUNTRY);
      const resetFees = defaultDoctorFeeFormValues(DEFAULT_PATIENT_COUNTRY);
      setPriceLocal(resetFees.textLocal);
      setPriceUsd(resetFees.textUsd);
      setClinicLocation("");
      setSpecialityId("");
      setPhoto(null);
      setPhotoPreview(null);
    } catch (e) {
      const message = (e as Error).message || t.registerWithUs.sendFailed;
      setSubmitError(message);
      setSent(false);
      showErrorToast(t.registerWithUs.sendFailed, message);
    } finally {
      setSending(false);
    }
  };

  return (
    <View style={[styles.wrap, style]}>
      {showHero ? (
        <View style={[styles.hero, { alignItems: isRTL ? "flex-end" : "flex-start" }]}>
          <View style={[styles.heroIcon, { backgroundColor: `${colors.primary}18` }]}>
            <Stethoscope size={28} color={colors.primary} strokeWidth={2.2} />
          </View>
          <Text style={[styles.heroTitle, { color: colors.foreground, textAlign }]}>
            {t.registerWithUs.title}
          </Text>
          <Text style={[styles.heroSubtitle, { color: colors.mutedForeground, textAlign }]}>
            {t.registerWithUs.subtitle}
          </Text>
        </View>
      ) : (
        <View style={[styles.intro, { flexDirection: dir }]}>
          <View style={[styles.iconWrap, { backgroundColor: `${colors.primary}14` }]}>
            <Stethoscope size={20} color={colors.primary} />
          </View>
          <Text style={[styles.subtitle, { color: colors.mutedForeground, textAlign }]}>
            {t.registerWithUs.subtitle}
          </Text>
        </View>
      )}

      {sent ? (
        <View
          style={[
            styles.statusBanner,
            {
              backgroundColor: `${colors.success}14`,
              borderColor: `${colors.success}55`,
            },
          ]}
        >
          <Text style={[styles.statusBannerText, { color: colors.success, textAlign }]}>
            {t.registerWithUs.sent}
          </Text>
        </View>
      ) : null}

      {submitError ? (
        <View
          style={[
            styles.statusBanner,
            {
              backgroundColor: `${colors.destructive}14`,
              borderColor: `${colors.destructive}55`,
            },
          ]}
        >
          <Text style={[styles.statusBannerTitle, { color: colors.destructive, textAlign }]}>
            {t.registerWithUs.sendFailed}
          </Text>
          {submitError !== t.registerWithUs.sendFailed ? (
            <Text
              style={[styles.statusBannerText, { color: colors.destructive, textAlign, opacity: 0.9 }]}
            >
              {submitError}
            </Text>
          ) : null}
        </View>
      ) : null}

      <View style={styles.fields}>
        <FieldBlock label={t.registerWithUs.photoLabel} error={fieldErrors.photo} centered>
          <Pressable onPress={pickPhoto} disabled={sending} style={styles.photoWrap}>
            {photoPreview ? (
              <Image source={{ uri: photoPreview }} style={styles.photoPreview} />
            ) : (
              <View
                style={[
                  styles.photoPlaceholder,
                  {
                    borderColor: fieldErrors.photo ? colors.destructive : colors.border,
                    backgroundColor: colors.muted,
                  },
                ]}
              >
                <UserRound size={36} color={colors.mutedForeground} />
              </View>
            )}
          </Pressable>
        </FieldBlock>

        <FieldBlock label={t.registerWithUs.nameLabel} error={fieldErrors.doctorName}>
          <AppTextInput
            value={doctorName}
            onChangeText={(value) => {
              setDoctorName(value);
              if (fieldErrors.doctorName) {
                setFieldErrors((prev) => ({ ...prev, doctorName: undefined }));
              }
            }}
            placeholder={t.auth.namePlaceholder}
            autoCapitalize="words"
            editable={!sending}
            error={!!fieldErrors.doctorName}
            style={[
              styles.input,
              inputStyle(colors, fieldErrors.doctorName, textAlign),
            ]}
          />
        </FieldBlock>

        <FieldBlock label={t.registerWithUs.emailLabel} error={fieldErrors.email}>
          <AppTextInput
            value={email}
            onChangeText={(value) => {
              setEmail(value);
              if (fieldErrors.email) {
                setFieldErrors((prev) => ({ ...prev, email: undefined }));
              }
            }}
            placeholder={t.auth.emailPlaceholder}
            keyboardType="email-address"
            autoCapitalize="none"
            autoCorrect={false}
            editable={!sending}
            error={!!fieldErrors.email}
            style={[
              styles.input,
              inputStyle(colors, fieldErrors.email, textAlign),
            ]}
          />
        </FieldBlock>

        <DoctorSignupMarketField
          isRTL={isRTL}
          value={country}
          onChange={(code) => {
            setCountry(code);
            const fees = defaultDoctorFeeFormValues(code);
            setPriceLocal(fees.textLocal);
            setPriceUsd(fees.textUsd);
            if (fieldErrors.country) {
              setFieldErrors((prev) => ({ ...prev, country: undefined }));
            }
          }}
          error={fieldErrors.country}
          disabled={sending}
        />

        <FieldBlock label={t.registerWithUs.phoneLabel} error={fieldErrors.phone}>
          <View style={[styles.phoneRow, { flexDirection: dir }]}>
            <View
              style={[
                styles.phonePrefix,
                {
                  backgroundColor: `${colors.primary}12`,
                  borderColor: fieldErrors.phone ? colors.destructive : colors.border,
                },
              ]}
            >
              <Text style={[styles.phonePrefixText, { color: colors.primary }]}>{dialCode}</Text>
            </View>
            <AppTextInput
              value={phoneLocal}
              onChangeText={(value) => {
                setPhoneLocal(value.replace(/[^\d\s-]/g, ""));
                if (fieldErrors.phone) {
                  setFieldErrors((prev) => ({ ...prev, phone: undefined }));
                }
              }}
              placeholder={phonePlaceholder}
              keyboardType="phone-pad"
              editable={!sending}
              error={!!fieldErrors.phone}
              style={[
                styles.phoneInput,
                inputStyle(colors, fieldErrors.phone, textAlign),
              ]}
            />
          </View>
        </FieldBlock>

        <View
          style={[
            styles.pricingPanel,
            {
              backgroundColor: colors.card,
              borderColor: colors.border,
            },
          ]}
        >
          <Text style={[styles.pricingTitle, { color: colors.foreground, textAlign }]}>
            {t.registerWithUs.pricingTitle}{" "}
            <Text style={{ color: colors.mutedForeground, fontWeight: "600" }}>
              {t.registerWithUs.pricingOptional}
            </Text>
          </Text>
          <View
            style={[
              styles.pricingDisclaimer,
              {
                backgroundColor: `${colors.primary}10`,
                borderColor: `${colors.primary}33`,
                flexDirection: dir,
              },
            ]}
          >
            <Info size={18} color={colors.primary} strokeWidth={2.2} />
            <Text
              style={[
                styles.pricingDisclaimerText,
                { color: colors.foreground, textAlign },
              ]}
            >
              {t.registerWithUs.pricingDisclaimer}
            </Text>
          </View>
          <View style={styles.pricingFields}>
            <PriceField
              label={insidePriceLabel}
              currency={homeCurrency}
              value={priceLocal}
              onChangeText={(value) => {
                setPriceLocal(value);
                if (fieldErrors.priceLocal) {
                  setFieldErrors((prev) => ({ ...prev, priceLocal: undefined }));
                }
              }}
              error={fieldErrors.priceLocal}
              disabled={sending}
              isRTL={isRTL}
              textAlign={textAlign}
            />
            <PriceField
              label={outsidePriceLabel}
              currency="USD"
              value={priceUsd}
              onChangeText={(value) => {
                setPriceUsd(value);
                if (fieldErrors.priceUsd) {
                  setFieldErrors((prev) => ({ ...prev, priceUsd: undefined }));
                }
              }}
              error={fieldErrors.priceUsd}
              disabled={sending}
              isRTL={isRTL}
              textAlign={textAlign}
            />
          </View>
        </View>

        <FieldBlock label={t.registerWithUs.clinicLocationLabel}>
          <AppTextInput
            value={clinicLocation}
            onChangeText={setClinicLocation}
            placeholder={t.registerWithUs.clinicLocationPlaceholder}
            editable={!sending}
            style={[
              styles.input,
              inputStyle(colors, undefined, textAlign),
            ]}
          />
        </FieldBlock>

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
          disabled={sending}
        />
      </View>

      <Pressable
        onPress={() => void submit()}
        disabled={sending}
        style={({ pressed, hovered }: { pressed: boolean; hovered?: boolean }) => [
          primaryButton(),
          styles.sendBtn,
          UI.shadowMd,
          {
            backgroundColor: sending ? colors.mutedForeground : colors.primary,
            opacity: pressed || hovered ? 0.92 : 1,
          },
        ]}
      >
        {sending ? (
          <ActivityIndicator color="#fff" />
        ) : (
          <Text style={[styles.sendText, { color: colors.primaryForeground }]}>
            {t.registerWithUs.submit}
          </Text>
        )}
      </Pressable>
    </View>
  );
}

function PriceField({
  label,
  currency,
  value,
  onChangeText,
  error,
  disabled,
  isRTL,
  textAlign,
}: {
  label: string;
  currency: string;
  value: string;
  onChangeText: (value: string) => void;
  error?: string;
  disabled?: boolean;
  isRTL: boolean;
  textAlign: "left" | "right" | "center";
}) {
  const colors = useColors();
  const dir = flexRow(isRTL);

  return (
    <View style={styles.priceField}>
      <Text style={[styles.label, { color: colors.foreground, textAlign }]}>{label}</Text>
      <View style={[styles.priceInputRow, { flexDirection: dir }]}>
        <View
          style={[
            styles.currencyPrefix,
            {
              backgroundColor: `${colors.primary}12`,
              borderColor: error ? colors.destructive : colors.border,
            },
          ]}
        >
          <Text style={[styles.currencyPrefixText, { color: colors.primary }]}>{currency}</Text>
        </View>
        <AppTextInput
          value={value}
          onChangeText={onChangeText}
          editable={!disabled}
          placeholder="0"
          placeholderTextColor={colors.mutedForeground}
          keyboardType="decimal-pad"
          error={!!error}
          style={[
            styles.priceInput,
            inputStyle(colors, error, textAlign),
          ]}
        />
      </View>
      {error ? (
        <Text style={[styles.fieldError, { color: colors.destructive, textAlign }]}>{error}</Text>
      ) : null}
    </View>
  );
}

function FieldBlock({
  label,
  error,
  children,
  centered = false,
}: {
  label: string;
  error?: string;
  children: React.ReactNode;
  centered?: boolean;
}) {
  const colors = useColors();
  const { isRTL } = useI18n();
  const textAlign = centered ? "center" : alignText(isRTL);

  return (
    <View style={[styles.fieldBlock, centered && styles.fieldBlockCentered]}>
      <Text style={[styles.label, { color: colors.foreground, textAlign, width: centered ? "100%" : undefined }]}>
        {label}
      </Text>
      {children}
      {error ? (
        <Text style={[styles.fieldError, { color: colors.destructive, textAlign, width: centered ? "100%" : undefined }]}>
          {error}
        </Text>
      ) : null}
    </View>
  );
}

function inputStyle(
  colors: ReturnType<typeof useColors>,
  error: string | undefined,
  textAlign: "left" | "right" | "center",
) {
  return {
    backgroundColor: colors.card,
    borderColor: error ? colors.destructive : colors.border,
    color: colors.foreground,
    textAlign,
  };
}

const styles = StyleSheet.create({
  wrap: { gap: UI.space.md },
  hero: { gap: UI.space.sm, marginBottom: UI.space.xs },
  heroIcon: {
    width: 56,
    height: 56,
    borderRadius: 16,
    alignItems: "center",
    justifyContent: "center",
    marginBottom: UI.space.xs,
  },
  heroTitle: {
    fontSize: 26,
    fontWeight: "800",
    letterSpacing: -0.4,
    lineHeight: 32,
  },
  heroSubtitle: {
    fontSize: 15,
    lineHeight: 22,
    maxWidth: 520,
    marginTop: UI.space.md,
  },
  intro: { alignItems: "flex-start", gap: 12 },
  iconWrap: {
    width: 40,
    height: 40,
    borderRadius: 12,
    alignItems: "center",
    justifyContent: "center",
  },
  subtitle: { flex: 1, fontSize: 14, lineHeight: 20 },
  statusBanner: {
    borderWidth: 1,
    borderRadius: UI.radius.inner,
    paddingHorizontal: 14,
    paddingVertical: 12,
    gap: 4,
  },
  statusBannerTitle: { fontSize: 14, fontWeight: "800" },
  statusBannerText: { fontSize: 14, fontWeight: "700", lineHeight: 20 },
  fields: { gap: UI.space.md },
  fieldBlockCentered: { alignItems: "center" },
  photoWrap: { alignSelf: "center" },
  photoPreview: {
    width: 96,
    height: 96,
    borderRadius: 48,
  },
  photoPlaceholder: {
    width: 96,
    height: 96,
    borderRadius: 48,
    borderWidth: 1,
    borderStyle: "dashed",
    alignItems: "center",
    justifyContent: "center",
  },
  fieldBlock: { gap: 8 },
  label: { fontSize: 13, fontWeight: "700" },
  input: {
    borderWidth: 1,
    borderRadius: UI.radius.inner,
    paddingHorizontal: 14,
    paddingVertical: 13,
    fontSize: 15,
  },
  phoneRow: { alignItems: "stretch", gap: 8 },
  phonePrefix: {
    borderWidth: 1,
    borderRadius: UI.radius.inner,
    paddingHorizontal: 12,
    justifyContent: "center",
    minWidth: 72,
  },
  phonePrefixText: { fontSize: 15, fontWeight: "800", textAlign: "center" },
  phoneInput: {
    flex: 1,
    borderWidth: 1,
    borderRadius: UI.radius.inner,
    paddingHorizontal: 14,
    paddingVertical: 13,
    fontSize: 15,
  },
  pricingPanel: {
    gap: 12,
    borderWidth: 1,
    borderRadius: UI.radius.card,
    padding: 14,
  },
  pricingTitle: { fontSize: 14, fontWeight: "800" },
  pricingDisclaimer: {
    alignItems: "flex-start",
    gap: 10,
    borderWidth: 1,
    borderRadius: UI.radius.inner,
    paddingHorizontal: 12,
    paddingVertical: 10,
  },
  pricingDisclaimerText: {
    flex: 1,
    fontSize: 13,
    lineHeight: 19,
    fontWeight: "600",
  },
  pricingFields: { gap: 12 },
  priceField: { gap: 8 },
  priceInputRow: { alignItems: "stretch", gap: 8 },
  currencyPrefix: {
    borderWidth: 1,
    borderRadius: UI.radius.inner,
    paddingHorizontal: 12,
    justifyContent: "center",
    minWidth: 64,
  },
  currencyPrefixText: { fontSize: 13, fontWeight: "800", textAlign: "center" },
  priceInput: {
    flex: 1,
    borderWidth: 1,
    borderRadius: UI.radius.inner,
    paddingHorizontal: 14,
    paddingVertical: 13,
    fontSize: 15,
  },
  fieldError: { fontSize: 12, fontWeight: "600" },
  sendBtn: {
    marginTop: UI.space.sm,
    borderRadius: UI.radius.card,
    paddingVertical: 15,
  },
  sendText: { fontSize: 16, fontWeight: "800" },
});
