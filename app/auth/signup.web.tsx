import SignupScreen from "./signup.tsx";
import { AuthScreenRoot } from "@/components/auth/AuthScreenRoot.web";
import { WebAuthFrame } from "@/components/web/WebAuthFrame";
import { useI18n } from "@/hooks/useI18n";

export default function SignupScreenWeb() {
  const { t } = useI18n();

  return (
    <WebAuthFrame
      scrollForm
      backgroundVariant="login-hero"
      eyebrow={t.auth.signUpEyebrow}
      showBack={false}
    >
      <AuthScreenRoot>
        <SignupScreen />
      </AuthScreenRoot>
    </WebAuthFrame>
  );
}
