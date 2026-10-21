import * as DocumentPicker from "expo-document-picker";
import { useState } from "react";
import { Alert } from "react-native";
import {
  isDocumentScannerAvailable,
  scanDocumentPage,
} from "@/utils/documentScanner";

export interface AiFileAttachment {
  /** base64 without the data: prefix */
  data: string;
  mimeType: string;
  name: string;
  previewUri?: string;
  /** Local URI used for HTTP upload (documents). */
  uploadUri?: string;
  webFile?: File;
  isPdf: boolean;
}

const DOCX_MIME =
  "application/vnd.openxmlformats-officedocument.wordprocessingml.document";

/** ~10 MB as base64 (base64 ≈ 4/3 of the raw bytes). */
const MAX_BASE64_LENGTH = 14_000_000;

async function uriToBase64(
  uri: string,
): Promise<{ data: string; mimeType: string }> {
  const res = await fetch(uri);
  const blob = await res.blob();
  const dataUrl = await new Promise<string>((resolve, reject) => {
    const reader = new FileReader();
    reader.onerror = () => reject(new Error("Could not read file"));
    reader.onloadend = () => resolve(String(reader.result));
    reader.readAsDataURL(blob);
  });
  const match = /^data:([^;]+);base64,(.*)$/.exec(dataUrl);
  return {
    mimeType: match?.[1] ?? blob.type ?? "application/octet-stream",
    data: match?.[2] ?? "",
  };
}

/** Pick an image or PDF and expose it as base64 for the AI chat. */
export function useAiFileAttachment() {
  const [attachment, setAttachment] = useState<AiFileAttachment | null>(null);
  const [loading, setLoading] = useState(false);

  const pickFile = async () => {
    setLoading(true);
    try {
      const result = await DocumentPicker.getDocumentAsync({
        type: ["image/*", "application/pdf", DOCX_MIME],
        copyToCacheDirectory: true,
      });
      if (result.canceled || !result.assets?.[0]) return;
      const asset = result.assets[0];
      const uri = asset.uri;
      const { data, mimeType } = await uriToBase64(uri);
      const lowerName = asset.name?.toLowerCase() ?? "";
      const resolvedMime =
        asset.mimeType?.toLowerCase() ||
        mimeType ||
        (lowerName.endsWith(".pdf")
          ? "application/pdf"
          : lowerName.endsWith(".docx")
            ? DOCX_MIME
            : "image/jpeg");
      const isImage = resolvedMime.startsWith("image/");
      const supported =
        isImage || resolvedMime === "application/pdf" || resolvedMime === DOCX_MIME;
      if (!supported) {
        Alert.alert("Unsupported file", "Please attach an image, PDF or DOCX.");
        return;
      }
      if (!data || data.length > MAX_BASE64_LENGTH) {
        Alert.alert("File too large", "Please attach a file under ~10 MB.");
        return;
      }
      setAttachment({
        data,
        mimeType: resolvedMime,
        name: asset.name ?? (isImage ? "image" : "document"),
        previewUri: isImage ? uri : undefined,
        uploadUri: uri,
        webFile: asset.file as File | undefined,
        // `isPdf` here means "render as a file chip" (non-image document).
        isPdf: !isImage,
      });
    } catch (e) {
      Alert.alert("Error", (e as Error).message);
    } finally {
      setLoading(false);
    }
  };

  /** Native only: camera in document-scan mode, attached as a JPEG page. */
  const scanFile = async () => {
    setLoading(true);
    try {
      const page = await scanDocumentPage();
      if (!page) return;
      const { data } = await uriToBase64(page.uri);
      if (!data || data.length > MAX_BASE64_LENGTH) {
        Alert.alert("File too large", "Please attach a file under ~10 MB.");
        return;
      }
      setAttachment({
        data,
        mimeType: page.mimeType,
        name: page.name,
        previewUri: page.uri,
        uploadUri: page.uri,
        isPdf: false,
      });
    } catch (e) {
      Alert.alert("Error", (e as Error).message);
    } finally {
      setLoading(false);
    }
  };

  const clear = () => setAttachment(null);

  return {
    attachment,
    loading,
    pickFile,
    scanFile,
    canScan: isDocumentScannerAvailable,
    clear,
  };
}
