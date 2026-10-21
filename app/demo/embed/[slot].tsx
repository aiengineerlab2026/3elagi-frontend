import { Redirect } from "expo-router";

/** Demo embed is web-only; native builds go home. */
export default function DemoEmbedNativeRedirect() {
  return <Redirect href="/(tabs)" />;
}
