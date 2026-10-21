import { useEffect } from "react";
import { consumeSessionTransferFromUrl } from "@/domains/market/marketSiteUrl";

/**
 * Backup for `_st` session restore if rehydration already finished.
 * Primary path is auth store `onRehydrateStorage`.
 */
export function SessionTransferBootstrap() {
  useEffect(() => {
    consumeSessionTransferFromUrl();
  }, []);

  return null;
}
