import LoginScreen from "./login.tsx";
import { AuthScreenRoot } from "@/components/auth/AuthScreenRoot.web";
import { WebAuthFrame } from "@/components/web/WebAuthFrame";
import { useI18n } from "@/hooks/useI18n";

export default function LoginScreenWeb() {
  const { t } = useI18n();

  return (
    <WebAuthFrame
      backgroundVariant="login-hero"
      eyebrow={t.auth.signInEyebrow}
      showBack={false}
    >
      <AuthScreenRoot>
        <LoginScreen />
      </AuthScreenRoot>
    </WebAuthFrame>
  );
}
