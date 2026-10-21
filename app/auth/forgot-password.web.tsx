import ForgotPasswordScreen from "./forgot-password.tsx";
import { AuthScreenRoot } from "@/components/auth/AuthScreenRoot.web";
import { WebAuthFrame } from "@/components/web/WebAuthFrame";
import { useI18n } from "@/hooks/useI18n";

export default function ForgotPasswordScreenWeb() {
  const { t } = useI18n();

  return (
    <WebAuthFrame
      backgroundVariant="login-hero"
      eyebrow={t.auth.forgotPasswordEyebrow}
      headline={t.auth.forgotPasswordTitle}
      description={t.auth.forgotPasswordSubtitle}
    >
      <AuthScreenRoot>
        <ForgotPasswordScreen />
      </AuthScreenRoot>
    </WebAuthFrame>
  );
}
