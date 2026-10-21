import React from "react";
import { Platform, Pressable, StyleSheet, Text, View } from "react-native";
import { AppBackButton } from "@/components/nav/AppBackButton";
import { Avatar } from "@/components/Avatar";
import { ViewPatientRecordsButton } from "@/components/chat/ViewPatientRecordsButton";
import { NameWithCountryFlag } from "@/components/NameWithCountryFlag";
import { EHR } from "@/constants/ehrDesign";
import type { ChatUser } from "@/domains/chat/types";
import { formatPresenceLabel } from "@/domains/chat/presence";
import { useColors } from "@/hooks/useColors";
import { chatFlexRow, flexRow } from "@/utils/rtl";

type Props = {
  peer: ChatUser;
  isRTL: boolean;
  desktopLayout?: boolean;
  paddingTop: number;
  backFallback: string;
  onBackAccessibilityLabel: string;
  subtitle: string;
  subtitleAccent?: boolean;
  onPeerPress?: () => void;
  canOpenPatientRecord: boolean;
  onOpenPatientRecord: () => void;
};

export function ChatHeader({
  peer,
  isRTL,
  desktopLayout = false,
  paddingTop,
  backFallback,
  onBackAccessibilityLabel,
  subtitle,
  subtitleAccent = false,
  onPeerPress,
  canOpenPatientRecord,
  onOpenPatientRecord,
}: Props) {
  const colors = useColors();
  const headerDir = flexRow(isRTL);
  const rowDir = chatFlexRow();

  return (
    <View
      style={[
        styles.header,
        desktopLayout && styles.headerDesktop,
        {
          paddingTop,
          backgroundColor: desktopLayout ? EHR.bg.app : colors.card,
          borderBottomColor: EHR.border,
          flexDirection: headerDir,
        },
      ]}
    >
      <AppBackButton
        color={EHR.text.primary}
        style={styles.backBtn}
        fallback={backFallback}
        accessibilityLabel={onBackAccessibilityLabel}
      />

      <Pressable
        onPress={onPeerPress}
        disabled={!onPeerPress}
        style={[styles.peerBlock, { flexDirection: headerDir }]}
      >
        <Avatar
          uri={peer.photoUrl}
          seed={peer.id}
          role={
            peer.role === "doctor"
              ? "doctor"
              : peer.role === "patient"
                ? "patient"
                : undefined
          }
          size={36}
          presence={peer.presence}
        />
        <View style={styles.peerCopy}>
          <NameWithCountryFlag
            name={peer.name}
            country={peer.role === "patient" ? peer.country : undefined}
            isRTL={isRTL}
            nameStyle={[styles.peerName, { color: EHR.text.primary, textAlign: isRTL ? "right" : "left" }]}
          />
          <Text
            style={[
              styles.subtitle,
              {
                color: subtitleAccent ? EHR.brand : EHR.text.secondary,
                textAlign: isRTL ? "right" : "left",
              },
            ]}
            numberOfLines={1}
          >
            {subtitle}
          </Text>
        </View>
      </Pressable>

      {canOpenPatientRecord ? (
        <View style={[styles.actionCluster, { flexDirection: rowDir }]}>
          <ViewPatientRecordsButton onPress={onOpenPatientRecord} />
        </View>
      ) : null}
    </View>
  );
}

export function chatHeaderSubtitle(opts: {
  peer: ChatUser;
  isRTL: boolean;
  consultationOpen: boolean;
  testPatientThinking: boolean;
  peerTyping: boolean;
}): { text: string; accent: boolean } {
  const { peer, isRTL, consultationOpen, testPatientThinking, peerTyping } = opts;

  if (testPatientThinking) {
    return { text: isRTL ? "المريض يفكر…" : "Patient is thinking…", accent: true };
  }
  if (peerTyping) {
    return { text: isRTL ? "يكتب…" : "typing…", accent: true };
  }
  if (consultationOpen && peer.role === "patient") {
    return { text: isRTL ? "استشارة نشطة" : "Consultation active", accent: true };
  }
  return {
    text: formatPresenceLabel(peer, isRTL),
    accent: peer.presence === "online",
  };
}

const styles = StyleSheet.create({
  header: {
    alignItems: "center",
    gap: 12,
    paddingHorizontal: 16,
    paddingBottom: 12,
    borderBottomWidth: 1,
    overflow: "visible",
    ...Platform.select({
      web: { transition: "background-color 150ms ease" } as object,
      default: {},
    }),
  },
  headerDesktop: {
    paddingHorizontal: 20,
    paddingBottom: 14,
  },
  backBtn: { padding: 4 },
  peerBlock: {
    flex: 1,
    alignItems: "center",
    gap: 10,
    minWidth: 0,
  },
  peerCopy: { flex: 1, minWidth: 0, gap: 1 },
  peerName: { fontSize: 16, fontWeight: "600" },
  subtitle: { fontSize: 12, fontWeight: "500", marginTop: 1 },
  actionCluster: {
    alignItems: "center",
    gap: 8,
    flexShrink: 0,
  },
});
