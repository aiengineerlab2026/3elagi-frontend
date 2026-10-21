export type ScannedPage = {
  uri: string;
  name: string;
  mimeType: string;
};

/** No document scanner in the browser — callers hide the option. */
export const isDocumentScannerAvailable = false;

export async function scanDocumentPages(): Promise<ScannedPage[]> {
  return [];
}

export async function scanDocumentPage(): Promise<ScannedPage | null> {
  return null;
}
