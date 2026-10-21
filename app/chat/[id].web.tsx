import { useRouter } from "expo-router";
import { useEffect } from "react";
import ChatScreen from "./[id].tsx";
import { WebDesktopShell } from "@/components/web/WebDesktopShell";
import { WebMobileTabShell } from "@/components/web/WebMobileTabShell";
import { navigateToWelcome } from "@/domains/auth/navigation";
import { isSignedIn } from "@/domains/auth/session";
import { useAuthStore } from "@/domains/auth/store";
import { useWebLayout } from "@/hooks/useWebLayout";

export default function ChatScreenWeb() {
  const router = useRouter();
  const hydrated = useAuthStore((s) => s.hydrated);
  const profile = useAuthStore((s) => s.profile);
  const accessToken = useAuthStore((s) => s.accessToken);
  const signedIn = isSignedIn(profile, accessToken);
  const { isDesktop } = useWebLayout();

  useEffect(() => {
    if (!hydrated || signedIn) return;
    navigateToWelcome(router);
  }, [hydrated, signedIn, router]);

  if (!hydrated || !signedIn) return null;

  if (!isDesktop) {
    return (
      <WebMobileTabShell>
        <ChatScreen />
      </WebMobileTabShell>
    );
  }

  return (
    <WebDesktopShell>
      <ChatScreen desktopLayout />
    </WebDesktopShell>
  );
}
