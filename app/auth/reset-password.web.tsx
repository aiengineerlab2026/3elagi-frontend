import ResetPasswordScreen from "./reset-password.tsx";
import { AuthScreenRoot } from "@/components/auth/AuthScreenRoot.web";
import { WebAuthFrame } from "@/components/web/WebAuthFrame";
import { useI18n } from "@/hooks/useI18n";

export default function ResetPasswordScreenWeb() {
  const { t } = useI18n();

  return (
    <WebAuthFrame
      backgroundVariant="login-hero"
      eyebrow={t.auth.resetPasswordEyebrow}
      headline={t.auth.resetPasswordTitle}
      description={t.auth.resetPasswordSubtitle}
    >
      <AuthScreenRoot>
        <ResetPasswordScreen />
      </AuthScreenRoot>
    </WebAuthFrame>
  );
}
