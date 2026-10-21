import { router } from "expo-router";
import { navigateBack } from "@/utils/appNavigation";

/**
 * Leave an add-medical form — pop stack, otherwise go to records.
 * `returnTo` (set when the form was opened from a chat thread) wins over both:
 * the doctor came from the conversation and expects to land back in it.
 */
export function leaveMedicalForm(
  fallback: "/(tabs)/records" | `/patients/${string}` = "/(tabs)/records",
  returnTo?: string | null,
) {
  if (returnTo) {
    router.replace(returnTo as never);
    return;
  }
  navigateBack(router, fallback);
}
