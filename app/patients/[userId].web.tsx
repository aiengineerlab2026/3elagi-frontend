import PatientProfileScreen from "./[userId].tsx";
import { WebDesktopShell } from "@/components/web/WebDesktopShell";

export default function PatientProfileScreenWeb() {
  return (
    <WebDesktopShell>
      <PatientProfileScreen />
    </WebDesktopShell>
  );
}
