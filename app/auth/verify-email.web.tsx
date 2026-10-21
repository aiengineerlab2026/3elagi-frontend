import VerifyEmailScreen from "./verify-email.tsx";
import { AuthScreenRoot } from "@/components/auth/AuthScreenRoot.web";
import { WebAuthFrame } from "@/components/web/WebAuthFrame";
import { useI18n } from "@/hooks/useI18n";

export default function VerifyEmailScreenWeb() {
  const { t } = useI18n();

  return (
    <WebAuthFrame
      backgroundVariant="login-hero"
      eyebrow={t.auth.verifyEmailEyebrow}
      headline={t.auth.verifyEmailTitle}
      description={t.auth.verifyEmailDescription}
    >
      <AuthScreenRoot>
        <VerifyEmailScreen />
      </AuthScreenRoot>
    </WebAuthFrame>
  );
}
