import React from "react";
import { PublicHeroMediaSection } from "@/components/marketing/PublicHeroMediaSection";
import { PublicHeroSection } from "@/components/marketing/PublicHeroSection";
import { PublicHowItWorksSection } from "@/components/marketing/PublicHowItWorksSection";
import { PublicRoleChoiceSection } from "@/components/marketing/PublicRoleChoiceSection";
import { useWebLayout } from "@/hooks/useWebLayout";

/** FAQ lives on its own page — the home landing stops at "how it works". */
export function PublicLandingSections() {
  const { isDesktop } = useWebLayout();

  return (
    <>
      {/* CTAs default to /doctors — see PublicHeroSection. */}
      <PublicHeroSection showMedia={isDesktop} />
      {!isDesktop ? <PublicHeroMediaSection /> : null}
      {/* No handler: the patient card always lands on the doctor directory. */}
      <PublicRoleChoiceSection />
      <PublicHowItWorksSection />
    </>
  );
}
