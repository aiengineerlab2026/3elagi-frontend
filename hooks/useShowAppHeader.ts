import { isSignedIn } from "@/domains/auth/session";
import { useAuthStore } from "@/domains/auth/store";
import { Platform } from "react-native";

/** AppHeader is hidden on web for guests — PublicLandingNav is shown in the tab layout instead. */
export function useShowAppHeader(): boolean {
  const profile = useAuthStore((s) => s.profile);
  const accessToken = useAuthStore((s) => s.accessToken);
  const signedIn = isSignedIn(profile, accessToken);

  if (Platform.OS === "web" && !signedIn) return false;
  return true;
}
