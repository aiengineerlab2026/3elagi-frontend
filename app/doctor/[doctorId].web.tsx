import DoctorProfileScreen from "./[doctorId].tsx";
import { DoctorWebView } from "@/components/doctor/DoctorWebView";
import { WebDesktopShell } from "@/components/web/WebDesktopShell";
import { useWebLayout } from "@/hooks/useWebLayout";

export default function DoctorProfileScreenWeb() {
  const { isDesktop } = useWebLayout();

  if (!isDesktop) {
    return <DoctorProfileScreen />;
  }

  return (
    <WebDesktopShell>
      <DoctorWebView />
    </WebDesktopShell>
  );
}
