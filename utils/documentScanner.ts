import DocumentScanner from "react-native-document-scanner-plugin";

export type ScannedPage = {
  uri: string;
  name: string;
  mimeType: string;
};

/** Native builds ship the scanner; the web bundle uses the stub next to this file. */
export const isDocumentScannerAvailable = true;

/**
 * Opens the camera in document mode (edge detection + perspective crop) and
 * returns the scanned pages as JPEG files. Empty array = user cancelled.
 */
export async function scanDocumentPages(
  maxPages = 1,
): Promise<ScannedPage[]> {
  const { scannedImages } = await DocumentScanner.scanDocument({
    croppedImageQuality: 90,
    maxNumDocuments: maxPages,
  });
  const stamp = Date.now();
  return (scannedImages ?? []).map((uri, index) => ({
    uri,
    name: `scan-${stamp}${index > 0 ? `-${index + 1}` : ""}.jpg`,
    mimeType: "image/jpeg",
  }));
}

/** Single page — what the attachment pickers want. */
export async function scanDocumentPage(): Promise<ScannedPage | null> {
  const pages = await scanDocumentPages(1);
  return pages[0] ?? null;
}
