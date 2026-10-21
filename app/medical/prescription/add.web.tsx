import { PrescriptionAddWebView } from "@/components/medical/PrescriptionAddWebView";
import { WebDesktopShell } from "@/components/web/WebDesktopShell";

export default function AddPrescriptionScreenWeb() {
  return (
    <WebDesktopShell>
      <PrescriptionAddWebView />
    </WebDesktopShell>
  );
}
