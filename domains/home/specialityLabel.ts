import type { Locale } from "@/domains/i18n/store";
import type { Speciality } from "@/domains/home/api";

/** German / Spanish display names keyed by English specialty name. */
const SPECIALITY_I18N: Record<string, Partial<Record<"de" | "es", string>>> = {
  "General Medicine": { de: "Allgemeinmedizin", es: "Medicina general" },
  Cardiology: { de: "Kardiologie", es: "Cardiología" },
  Dermatology: { de: "Dermatologie", es: "Dermatología" },
  Pediatrics: { de: "Pädiatrie", es: "Pediatría" },
  Orthopedics: { de: "Orthopädie", es: "Ortopedia" },
  Neurology: { de: "Neurologie", es: "Neurología" },
  Ophthalmology: { de: "Augenheilkunde", es: "Oftalmología" },
  Dentistry: { de: "Zahnmedizin", es: "Odontología" },
  Surgery: { de: "Chirurgie", es: "Cirugía" },
  Emergency: { de: "Notfallmedizin", es: "Urgencias" },
  Gynaecology: { de: "Gynäkologie", es: "Ginecología" },
  Gynecology: { de: "Gynäkologie", es: "Ginecología" },
  Nutritionist: { de: "Ernährungsberatung", es: "Nutrición" },
  Gastroenterology: { de: "Gastroenterologie", es: "Gastroenterología" },
};

type SpecialityNames = {
  nameEn: string;
  nameAr?: string | null;
};

/** Single specialty label for the active app language (no bilingual subtitle). */
export function specialityLabel(
  speciality: SpecialityNames,
  locale: Locale,
): string {
  const en = speciality.nameEn?.trim() || "";
  if (locale === "ar") {
    return speciality.nameAr?.trim() || en;
  }
  if (locale === "de" || locale === "es") {
    return SPECIALITY_I18N[en]?.[locale] || en;
  }
  return en;
}

export function specialityLabelFromSpeciality(
  speciality: Speciality,
  locale: Locale,
): string {
  return specialityLabel(speciality, locale);
}
