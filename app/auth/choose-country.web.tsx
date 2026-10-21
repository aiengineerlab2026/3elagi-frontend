import ChooseCountryScreen from "./choose-country.tsx";
import { AuthScreenRoot } from "@/components/auth/AuthScreenRoot.web";
import { WebAuthFrame } from "@/components/web/WebAuthFrame";
import { useI18n } from "@/hooks/useI18n";

export default function ChooseCountryScreenWeb() {
  const { t } = useI18n();

  return (
    <WebAuthFrame
      backgroundVariant="login-hero"
      eyebrow={t.auth.chooseCountryEyebrow}
      headline={t.auth.chooseCountryTitle}
      description={t.auth.chooseCountrySubtitle}
    >
      <AuthScreenRoot>
        <ChooseCountryScreen />
      </AuthScreenRoot>
    </WebAuthFrame>
  );
}
