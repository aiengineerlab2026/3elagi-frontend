import React from "react";
import { MobileAppDownloadModal } from "@/components/web/MobileAppDownloadModal.web";
import { useMobileAppDownloadStore } from "@/domains/mobileApp/downloadStore";

/** Mounted once at the app root so the dialog outlives the drawer that opened it. */
export function MobileAppDownloadHost() {
  const open = useMobileAppDownloadStore((s) => s.open);
  const closeDownload = useMobileAppDownloadStore((s) => s.closeDownload);

  return <MobileAppDownloadModal visible={open} onClose={closeDownload} />;
}
