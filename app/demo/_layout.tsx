import { Stack } from "expo-router";
import React from "react";

/** Demo shell + embed routes (web uses _layout.web.tsx override). */
export default function DemoLayout() {
  return (
    <Stack screenOptions={{ headerShown: false }}>
      <Stack.Screen name="index" />
      <Stack.Screen name="embed/[slot]" />
    </Stack>
  );
}
