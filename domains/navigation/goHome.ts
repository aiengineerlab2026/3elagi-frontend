import { router } from "expo-router";
import { HOME_NAV_RESET_EVENT } from "@/constants/appNav";
import { emit } from "@/utils/eventBus";

/** Brand logo / Home nav target: the home tab, reset to the specialities grid. */
export function goHome() {
  emit(HOME_NAV_RESET_EVENT);
  router.navigate("/(tabs)");
}
