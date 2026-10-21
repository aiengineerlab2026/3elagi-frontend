export const DOCTOR_SETTINGS_TABS = [
  {
    id: "personal",
    icon: "👤",
    labelEn: "Personal & Security",
    labelAr: "الشخصية والأمان",
  },
  {
    id: "practice",
    icon: "🩺",
    labelEn: "Practice & Speciality",
    labelAr: "الممارسة والتخصص",
  },
  {
    id: "pricing",
    icon: "💳",
    labelEn: "Pricing & Payouts",
    labelAr: "الأسعار والمدفوعات",
  },
  {
    id: "availability",
    icon: "📅",
    labelEn: "Availability & Schedule",
    labelAr: "التوفر والجدول",
  },
  {
    id: "surgery",
    icon: "🏥",
    labelEn: "Surgery availability",
    labelAr: "مواعيد العمليات",
  },
  {
    id: "verifications",
    icon: "📑",
    labelEn: "Verifications",
    labelAr: "التحقق",
  },
] as const;

export type DoctorSettingsTabId = (typeof DOCTOR_SETTINGS_TABS)[number]["id"];
