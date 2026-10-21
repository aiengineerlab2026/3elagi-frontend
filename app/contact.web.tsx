import React from "react";
import ContactScreen from "./contact.tsx";
import { WebDesktopShell } from "@/components/web/WebDesktopShell";
import { WebStackScreen } from "@/components/web/WebStackScreen";

export default function ContactScreenWeb() {
  return (
    <WebDesktopShell allowGuests>
      <WebStackScreen>
        <ContactScreen />
      </WebStackScreen>
    </WebDesktopShell>
  );
}
