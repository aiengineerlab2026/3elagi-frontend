import type { Locale } from "@/domains/i18n";
import type { Advertisement } from "@/domains/home/api";

type AdCopy = { title: string; description: string };

const ADVERTISEMENT_I18N: Record<string, Partial<Record<"ar" | "de" | "es", AdCopy>>> = {
  "Care in One Tap": {
    ar: {
      title: "رعايتك بلمسة واحدة",
      description: "تواصل مع أطباء موثوقين على 3elagi في أي وقت ومن أي مكان.",
    },
    de: {
      title: "Hilfe mit einem Tipp",
      description: "Chatten Sie jederzeit mit vertrauenswürdigen Ärzten auf 3elagi.",
    },
    es: {
      title: "Cuidado en un toque",
      description: "Habla con médicos de confianza en 3elagi cuando quieras.",
    },
  },
  "Trusted Doctors Near You": {
    ar: {
      title: "أطباء موثوقون بالقرب منك",
      description: "تصفح التخصصات والأطباء في مصر والأردن من مكان واحد.",
    },
    de: {
      title: "Vertrauenswürdige Ärzte in Ihrer Nähe",
      description: "Finden Sie Fachärzte in Ägypten und Jordanien an einem Ort.",
    },
    es: {
      title: "Médicos de confianza cerca de ti",
      description: "Explora especialistas en Egipto y Jordania en un solo lugar.",
    },
  },
  "Your AI Health Companion": {
    ar: {
      title: "مرافقك الصحي بالذكاء الاصطناعي",
      description: "اسأل 3elagi عن إرشاد صحي موثوق على مدار الساعة.",
    },
    de: {
      title: "Ihr KI-Gesundheitsbegleiter",
      description: "Fragen Sie 3elagi rund um die Uhr nach Gesundheitsrat.",
    },
    es: {
      title: "Tu compañero de salud con IA",
      description: "Pregunta a 3elagi por orientación de salud las 24 horas.",
    },
  },
  "Book. Chat. Heal.": {
    ar: {
      title: "احجز. تواصل. تعافَ.",
      description: "ابدأ استشارتك اليوم واحصل على الرعاية التي تحتاجها.",
    },
    de: {
      title: "Buchen. Chatten. Heilen.",
      description: "Starten Sie noch heute Ihre Beratung auf 3elagi.",
    },
    es: {
      title: "Reserva. Habla. Sana.",
      description: "Empieza tu consulta hoy y recibe la atención que necesitas.",
    },
  },
};

export function localizeAdvertisement(
  item: Advertisement,
  locale: Locale,
): Pick<Advertisement, "title" | "description"> {
  if (locale === "en") {
    return { title: item.title, description: item.description };
  }

  const translated = ADVERTISEMENT_I18N[item.title]?.[locale];
  return translated ?? { title: item.title, description: item.description };
}
