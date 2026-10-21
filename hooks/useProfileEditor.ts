import * as DocumentPicker from "expo-document-picker";
import * as ImagePicker from "expo-image-picker";
import { useCallback, useEffect, useState } from "react";
import { fetchSpecialities, type Speciality } from "@/domains/home/api";
import {
  fetchAccountProfile,
  updateAccountProfile,
  type AccountProfile,
  type DoctorCertification,
} from "@/domains/auth/profile-api";
import { useAuthStore } from "@/domains/auth/store";
import {
  DEFAULT_PATIENT_COUNTRY,
  normalizeMarketCountry,
  normalizePatientCountry,
  type PatientCountryCode,
} from "@/constants/patientCountries";
import { uploadFile } from "@/domains/medical/api";
import { feeText, feeValue } from "@/domains/doctor/fees";
import { showErrorToast, showSuccessToast } from "@/utils/toast";
import {
  ensureDoctorOnboarding,
  fetchDoctorMeTourState,
} from "@/domains/onboarding/doctorTourApi";
import { useProductTourStore } from "@/domains/onboarding/productTourStore";
import { useChatStore } from "@/domains/chat/store";

interface Options {
  accessToken: string;
  role: string;
  isRTL: boolean;
}

export function useProfileEditor({ accessToken, role, isRTL }: Options) {
  const setProfile = useAuthStore((s) => s.setProfile);
  const isDoctor = role.toLowerCase() === "doctor";

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [account, setAccount] = useState<AccountProfile | null>(null);
  const [name, setName] = useState("");
  const [phone, setPhone] = useState("");
  // Doctors sell in a market (EG/JO); patients just live somewhere.
  const [country, setCountry] = useState<PatientCountryCode>(DEFAULT_PATIENT_COUNTRY);
  const [birthDate, setBirthDate] = useState("");
  const [professionalTitle, setProfessionalTitle] = useState("");
  const [info, setInfo] = useState("");
  const [location, setLocation] = useState("");
  const [certifications, setCertifications] = useState<DoctorCertification[]>([]);
  const [certUploading, setCertUploading] = useState(false);
  const [specialities, setSpecialities] = useState<Speciality[]>([]);
  // First id is the primary speciality — the one browse and chat headers show.
  const [specialityIds, setSpecialityIds] = useState<string[]>([]);
  const specialityId = specialityIds[0] ?? "";
  const toggleSpeciality = (id: string) =>
    setSpecialityIds((prev) =>
      prev.includes(id) ? prev.filter((s) => s !== id) : [...prev, id],
    );
  const [consultationPrice, setConsultationPrice] = useState(1);
  const [videoConsultationPrice, setVideoConsultationPrice] = useState(1);
  const [videoConsultationMinutes, setVideoConsultationMinutes] = useState(30);
  const [immediateCallEnabled, setImmediateCallEnabled] = useState(false);
  const [digitalSignatureUrl, setDigitalSignatureUrl] = useState<string | null>(null);
  const [digitalSignatureLocalUri, setDigitalSignatureLocalUri] = useState<string | null>(
    null,
  );
  const [digitalSignatureDirty, setDigitalSignatureDirty] = useState(false);
  const [signatureUploading, setSignatureUploading] = useState(false);
  const [iban, setIban] = useState("");
  const [accountHolderFullName, setAccountHolderFullName] = useState("");
  const [nationalId, setNationalId] = useState("");
  // Cash fees are free text so the doctor can clear the field while typing.
  const [textPriceLocal, setTextPriceLocal] = useState("");
  const [textPriceUsd, setTextPriceUsd] = useState("");
  const [videoPriceLocal, setVideoPriceLocal] = useState("");
  const [videoPriceUsd, setVideoPriceUsd] = useState("");
  const [paymentLink, setPaymentLink] = useState("");
  const [patientPaymentMethod, setPatientPaymentMethod] = useState<"bank" | "wallet">("bank");
  const [tags, setTags] = useState<string[]>([]);
  const [photoUri, setPhotoUri] = useState<string | null>(null);
  const [photoUrl, setPhotoUrl] = useState<string | undefined>();
  const [photoDirty, setPhotoDirty] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const data = await fetchAccountProfile(accessToken, role);
      setAccount(data);
      setName(data.name);
      setPhone(data.phone);
      setCountry(
        isDoctor
          ? normalizeMarketCountry(data.country)
          : normalizePatientCountry(data.country),
      );
      setBirthDate(data.birthDate ?? "");
      setProfessionalTitle(data.professionalTitle ?? "");
      setInfo(data.info ?? "");
      setLocation(data.location ?? "");
      setCertifications(data.certifications ?? []);
      setSpecialityIds(
        data.specialityIds?.length
          ? data.specialityIds
          : data.specialityId
            ? [data.specialityId]
            : [],
      );
      setConsultationPrice(data.consultationPrice ?? 1);
      setVideoConsultationPrice(data.videoConsultationPrice ?? 1);
      setVideoConsultationMinutes(data.videoConsultationMinutes ?? 30);
      setImmediateCallEnabled(!!data.immediateCallEnabled);
      setDigitalSignatureUrl(data.digitalSignatureUrl ?? null);
      setDigitalSignatureLocalUri(null);
      setDigitalSignatureDirty(false);
      setIban(data.iban ?? "");
      setAccountHolderFullName(data.accountHolderFullName ?? "");
      setNationalId(data.nationalId ?? "");
      setTextPriceLocal(feeText(data.textPriceLocal));
      setTextPriceUsd(feeText(data.textPriceUsd));
      setVideoPriceLocal(feeText(data.videoPriceLocal));
      setVideoPriceUsd(feeText(data.videoPriceUsd));
      setPaymentLink(data.paymentLink ?? "");
      setPatientPaymentMethod(data.patientPaymentMethod ?? "bank");
      setTags(Array.isArray(data.tags) ? data.tags : []);
      setPhotoUrl(data.photoUrl);
      setPhotoUri(null);
      setPhotoDirty(false);
    } catch (e) {
      showErrorToast(isRTL ? "خطأ" : "Error", (e as Error).message);
    } finally {
      setLoading(false);
    }
  }, [accessToken, role, isRTL, isDoctor]);

  useEffect(() => {
    void load();
  }, [load]);

  useEffect(() => {
    if (!isDoctor) return;
    void fetchSpecialities()
      .then(setSpecialities)
      .catch(() => setSpecialities([]));
  }, [isDoctor]);

  const pickPhoto = async () => {
    const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (status !== "granted") {
      showErrorToast(
        isRTL ? "الإذن مطلوب" : "Permission required",
        isRTL ? "يرجى السماح بالوصول إلى الصور." : "Please allow photo library access.",
      );
      return;
    }
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ["images"],
      quality: 0.85,
      allowsEditing: true,
      aspect: [1, 1],
    });
    if (!result.canceled && result.assets[0]) {
      setPhotoUri(result.assets[0].uri);
      setPhotoDirty(true);
    }
  };

  const addCertification = async () => {
    const result = await DocumentPicker.getDocumentAsync({
      type: ["application/pdf", "image/*"],
      copyToCacheDirectory: true,
    });
    if (result.canceled || !result.assets[0]) return;
    const asset = result.assets[0];
    setCertUploading(true);
    try {
      const uploaded = await uploadFile(
        asset.uri,
        asset.mimeType ?? "application/pdf",
        asset.name || `certification-${Date.now()}`,
        accessToken,
        // On web the picked File is needed to build the upload body.
        asset.file,
      );
      setCertifications((prev) => [...prev, { url: uploaded.url, description: "" }]);
    } catch (e) {
      showErrorToast(isRTL ? "فشل الرفع" : "Upload failed", (e as Error).message);
    } finally {
      setCertUploading(false);
    }
  };

  const removeCertification = (url: string) => {
    setCertifications((prev) => prev.filter((c) => c.url !== url));
  };

  const setCertificationDescription = (url: string, description: string) => {
    setCertifications((prev) =>
      prev.map((c) => (c.url === url ? { ...c, description } : c)),
    );
  };

  const pickDigitalSignature = async () => {
    const result = await DocumentPicker.getDocumentAsync({
      type: ["image/png", "image/jpeg", "image/jpg", "image/webp"],
      copyToCacheDirectory: true,
    });
    if (result.canceled || !result.assets[0]) return;
    const asset = result.assets[0];
    setSignatureUploading(true);
    try {
      const uploaded = await uploadFile(
        asset.uri,
        asset.mimeType ?? "image/png",
        asset.name || `signature-${Date.now()}.png`,
        accessToken,
        asset.file,
      );
      setDigitalSignatureUrl(uploaded.url);
      setDigitalSignatureLocalUri(asset.uri);
      setDigitalSignatureDirty(true);
    } catch (e) {
      showErrorToast(isRTL ? "فشل الرفع" : "Upload failed", (e as Error).message);
    } finally {
      setSignatureUploading(false);
    }
  };

  const clearDigitalSignature = () => {
    setDigitalSignatureUrl(null);
    setDigitalSignatureLocalUri(null);
    setDigitalSignatureDirty(true);
  };

  const save = async () => {
    if (!name.trim()) {
      showErrorToast(isRTL ? "الاسم مطلوب" : "Name required");
      return false;
    }
    if (isDoctor && !specialityIds.length) {
      showErrorToast(
        isRTL ? "التخصص مطلوب" : "Speciality required",
        isRTL ? "اختر تخصصك الطبي." : "Please select your medical speciality.",
      );
      return false;
    }
    setSaving(true);
    const previousPrimarySpecialityId =
      account?.specialityIds?.[0] ?? account?.specialityId ?? "";
    try {
      let nextPhotoUrl = photoUrl ?? null;
      if (photoDirty && photoUri) {
        const uploaded = await uploadFile(
          photoUri,
          "image/jpeg",
          `avatar-${Date.now()}.jpg`,
          accessToken,
        );
        nextPhotoUrl = uploaded.url;
      }

      const updated = await updateAccountProfile(accessToken, role, {
        name,
        phone,
        country,
        birthDate: birthDate.trim() || undefined,
        professionalTitle: isDoctor ? professionalTitle : undefined,
        info: isDoctor ? info : undefined,
        location: isDoctor ? location : undefined,
        certifications: isDoctor ? certifications : undefined,
        specialityId: isDoctor ? specialityId : undefined,
        specialityIds: isDoctor ? specialityIds : undefined,
        consultationPrice: isDoctor ? consultationPrice : undefined,
        videoConsultationPrice: isDoctor ? videoConsultationPrice : undefined,
        videoConsultationMinutes: isDoctor ? videoConsultationMinutes : undefined,
        immediateCallEnabled: isDoctor ? immediateCallEnabled : undefined,
        digitalSignatureUrl: isDoctor
          ? digitalSignatureDirty
            ? digitalSignatureUrl
            : undefined
          : undefined,
        iban: isDoctor ? iban : undefined,
        accountHolderFullName: isDoctor ? accountHolderFullName : undefined,
        nationalId: isDoctor ? nationalId : undefined,
        textPriceLocal: isDoctor ? feeValue(textPriceLocal) : undefined,
        textPriceUsd: isDoctor ? feeValue(textPriceUsd) : undefined,
        videoPriceLocal: isDoctor ? feeValue(videoPriceLocal) : undefined,
        videoPriceUsd: isDoctor ? feeValue(videoPriceUsd) : undefined,
        paymentLink: isDoctor ? paymentLink.trim() : undefined,
        patientPaymentMethod: isDoctor ? patientPaymentMethod : undefined,
        tags: isDoctor ? tags : undefined,
        photoUrl: photoDirty ? nextPhotoUrl : undefined,
      });

      setProfile(updated);
      setPhotoUrl(updated.avatarUrl);
      setPhotoUri(null);
      setPhotoDirty(false);

      const refreshed = await fetchAccountProfile(accessToken, role);
      setAccount(refreshed);
      setSpecialityIds(
        refreshed.specialityIds?.length
          ? refreshed.specialityIds
          : refreshed.specialityId
            ? [refreshed.specialityId]
            : [],
      );

      if (isDoctor) {
        const approvedPrimaryId =
          refreshed.specialityIds?.[0] ?? refreshed.specialityId ?? "";
        const spec = specialities.find((s) => s.id === approvedPrimaryId);
        useAuthStore.setState({
          specialityId: approvedPrimaryId || null,
          specialty: spec?.nameEn ?? useAuthStore.getState().specialty,
        });

        const submittedPrimaryChange =
          !!refreshed.pendingSpecialityChange &&
          specialityId !== previousPrimarySpecialityId;

        if (submittedPrimaryChange) {
          showSuccessToast(
            isRTL ? "طُلب تغيير التخصص" : "Speciality change requested",
            isRTL
              ? "تم إرسال طلب تغيير التخصص الأساسي للمراجعة من الإدارة."
              : "Your primary speciality change was sent to admin for approval.",
          );
        } else if (
          approvedPrimaryId &&
          approvedPrimaryId !== previousPrimarySpecialityId
        ) {
          const tourState = await fetchDoctorMeTourState(accessToken);
          const testPatientId =
            tourState?.onboarding_test_patient_user_id ??
            (await ensureDoctorOnboarding(accessToken));
          if (testPatientId) {
            useProductTourStore.getState().setTestPatientUserId(testPatientId);
          }
          const profileId = useAuthStore.getState().profile?.id;
          if (profileId) {
            await useChatStore
              .getState()
              .loadConversations(accessToken, profileId, role);
          }
          showSuccessToast(
            isRTL ? "تم الحفظ" : "Saved",
            isRTL ? "تم تحديث ملفك." : "Profile updated.",
          );
        } else {
          showSuccessToast(
            isRTL ? "تم الحفظ" : "Saved",
            isRTL ? "تم تحديث ملفك." : "Profile updated.",
          );
        }
      } else {
        showSuccessToast(
          isRTL ? "تم الحفظ" : "Saved",
          isRTL ? "تم تحديث ملفك." : "Profile updated.",
        );
      }
      if (isDoctor && digitalSignatureDirty) {
        setDigitalSignatureDirty(false);
        setDigitalSignatureLocalUri(null);
      }
      return true;
    } catch (e) {
      showErrorToast(isRTL ? "فشل الحفظ" : "Save failed", (e as Error).message);
      return false;
    } finally {
      setSaving(false);
    }
  };

  return {
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
    setVideoConsultationMinutes,
    immediateCallEnabled,
    setImmediateCallEnabled,
    digitalSignatureUrl,
    digitalSignaturePreview: digitalSignatureLocalUri ?? digitalSignatureUrl,
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
    displayPhoto: photoUri ?? photoUrl,
    pickPhoto,
    save,
    pendingSpecialityChange: account?.pendingSpecialityChange ?? null,
  };
}
