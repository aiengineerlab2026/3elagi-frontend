import { MedicalRecordWebView } from "@/components/medical/MedicalRecordWebView";
import { WebDesktopShell } from "@/components/web/WebDesktopShell";
import { WebMobileTabShell } from "@/components/web/WebMobileTabShell";
import { useWebLayout } from "@/hooks/useWebLayout";

export default function MedicalRecordScreenWeb() {
  const { isDesktop } = useWebLayout();
  const content = <MedicalRecordWebView />;

  if (isDesktop) {
    return <WebDesktopShell>{content}</WebDesktopShell>;
  }

  return <WebMobileTabShell>{content}</WebMobileTabShell>;
}
