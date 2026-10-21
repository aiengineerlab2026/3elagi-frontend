import * as DocumentPicker from "expo-document-picker";
import * as ImagePicker from "expo-image-picker";
import { ActionSheetIOS, Alert, Platform } from "react-native";

export type PaymentReceiptAsset = {
  uri: string;
  mimeType?: string;
  name?: string;
  file?: File | Blob;
};

function fromDocument(asset: DocumentPicker.DocumentPickerAsset): PaymentReceiptAsset {
  return {
    uri: asset.uri,
    mimeType: asset.mimeType ?? undefined,
    name: asset.name,
    file: asset.file,
  };
}

function fromImage(asset: ImagePicker.ImagePickerAsset): PaymentReceiptAsset {
  return {
    uri: asset.uri,
    mimeType: asset.mimeType ?? "image/jpeg",
    name: asset.fileName ?? `receipt-${Date.now()}.jpg`,
    file: asset.file,
  };
}

async function pickViaDocumentPicker(): Promise<PaymentReceiptAsset | null> {
  const picked = await DocumentPicker.getDocumentAsync({
    type: ["image/*", "application/pdf"],
    copyToCacheDirectory: true,
  });
  if (picked.canceled || !picked.assets[0]) return null;
  return fromDocument(picked.assets[0]);
}

async function pickPhotoFromLibrary(): Promise<PaymentReceiptAsset | null> {
  const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
  if (status !== "granted") return null;

  const result = await ImagePicker.launchImageLibraryAsync({
    mediaTypes: ["images"],
    quality: 0.92,
  });
  if (result.canceled || !result.assets[0]) return null;
  return fromImage(result.assets[0]);
}

async function pickPdfDocument(): Promise<PaymentReceiptAsset | null> {
  const picked = await DocumentPicker.getDocumentAsync({
    type: "application/pdf",
    copyToCacheDirectory: true,
  });
  if (picked.canceled || !picked.assets[0]) return null;
  return fromDocument(picked.assets[0]);
}

function pickNativeSource(): Promise<"photo" | "pdf" | null> {
  return new Promise((resolve) => {
    const photo = "Photo library";
    const pdf = "PDF document";
    const cancel = "Cancel";

    if (Platform.OS === "ios") {
      ActionSheetIOS.showActionSheetWithOptions(
        { options: [photo, pdf, cancel], cancelButtonIndex: 2 },
        (index) => {
          if (index === 0) resolve("photo");
          else if (index === 1) resolve("pdf");
          else resolve(null);
        },
      );
      return;
    }

    Alert.alert("Attach receipt", undefined, [
      { text: photo, onPress: () => resolve("photo") },
      { text: pdf, onPress: () => resolve("pdf") },
      { text: cancel, style: "cancel", onPress: () => resolve(null) },
    ]);
  });
}

/** Opens the receipt picker — call synchronously from a press handler (web). */
export async function pickPaymentReceipt(): Promise<PaymentReceiptAsset | null> {
  if (Platform.OS === "web") {
    return pickViaDocumentPicker();
  }

  const source = await pickNativeSource();
  if (source === "photo") return pickPhotoFromLibrary();
  if (source === "pdf") return pickPdfDocument();
  return null;
}
