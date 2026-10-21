import { Redirect } from "expo-router";

/** Activity hub retired — sections live as top-level nav items. */
export default function ActivityTab() {
  return <Redirect href="/(tabs)/appointments" />;
}
