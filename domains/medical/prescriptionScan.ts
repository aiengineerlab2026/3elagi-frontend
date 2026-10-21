import type { Locale } from "@/domains/i18n/store";
import { analyzePrescriptionImage } from "./api";
import { MEDICAL_EVENTS } from "./events";
import { emit } from "@/utils/eventBus";
import type { PrescriptionMedication } from "./types";

export interface PrescriptionScanAsset {
  uri: string;
  mimeType: string;
  fileName: string;
  webFile?: File | Blob;
}

export function normalizePrescriptionScanFile(
  uri: string,
  mimeType?: string | null,
  fileName?: string | null,
): PrescriptionScanAsset {
  let mime = (mimeType || "").trim().toLowerCase();
  if (!mime || mime === "image") mime = "image/jpeg";
  if (mime === "image/jpg") mime = "image/jpeg";

  const ext =
    mime === "image/png"
      ? "png"
      : mime === "image/webp"
        ? "webp"
        : mime === "image/heic" || mime === "image/heif"
          ? "heic"
          : "jpg";

  const name = fileName?.trim() || `prescription-${Date.now()}.${ext}`;
  return { uri, mimeType: mime, fileName: name };
}

/** Upload a prescription image to the API and return extracted medication rows. */
export async function analyzePrescriptionScan(
  asset: PrescriptionScanAsset,
  accessToken: string,
  lang: Locale,
): Promise<PrescriptionMedication[]> {
  const normalized = normalizePrescriptionScanFile(
    asset.uri,
    asset.mimeType,
    asset.fileName,
  );
  const rows = await analyzePrescriptionImage(
    normalized.uri,
    normalized.mimeType,
    normalized.fileName,
    accessToken,
    lang,
    asset.webFile,
  );
  emit(MEDICAL_EVENTS.PRESCRIPTION_SCANNED, { token: accessToken });
  return rows;
}
