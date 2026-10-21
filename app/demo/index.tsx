import { Redirect } from "expo-router";

/** Demo shell is web-only; native builds go home. */
export default function DemoNativeRedirect() {
  return <Redirect href="/(tabs)" />;
}
