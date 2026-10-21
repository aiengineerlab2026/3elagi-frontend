import { MedicalDocumentRequestDetailScreen } from "@/components/medical/MedicalDocumentRequestDetailScreen";
import { WebDesktopShell } from "@/components/web/WebDesktopShell";
import { WebMobileTabShell } from "@/components/web/WebMobileTabShell";
import { useWebLayout } from "@/hooks/useWebLayout";

export default function MedicalDocumentRequestDetailWeb() {
  const { isDesktop } = useWebLayout();
  const content = <MedicalDocumentRequestDetailScreen />;

  if (isDesktop) {
    return <WebDesktopShell>{content}</WebDesktopShell>;
  }

  return <WebMobileTabShell>{content}</WebMobileTabShell>;
}
