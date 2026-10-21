import { Stack } from "expo-router";
import React from "react";

/** Demo shell + embed routes — no extra chrome; root layout still provides theme/toast. */
export default function DemoLayout() {
  return (
    <Stack screenOptions={{ headerShown: false }}>
      <Stack.Screen name="index" />
      <Stack.Screen name="embed/[slot]" />
    </Stack>
  );
}
