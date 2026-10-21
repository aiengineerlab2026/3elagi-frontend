import { resolveMediaUrl } from "@/domains/chat/avatar";
import type { Presence } from "@/domains/chat/types";
import { UserRound } from "lucide-react-native";
import React, { useEffect, useState } from "react";
import { Image, StyleSheet, View } from "react-native";
import { useColors } from "@/hooks/useColors";

interface Props {
  uri?: string | null;
  seed?: string;
  role?: "doctor" | "patient";
  size?: number;
  presence?: Presence;
  /** Messenger-style green ring for the “Active now” strip */
  highlightOnline?: boolean;
}

const dotColor = (
  p: Presence | undefined,
  success: string,
  warning: string,
  offline: string,
) => {
  if (p === "online") return success;
  if (p === "away") return warning;
  return offline;
};

export function Avatar({
  uri,
  seed = "anon",
  role,
  size = 52,
  presence,
  highlightOnline = false,
}: Props) {
  const colors = useColors();
  const dot = Math.max(14, Math.round(size * 0.28));
  const trimmed = uri?.trim();
  const [imageFailed, setImageFailed] = useState(false);
  const showPersonPlaceholder = !trimmed || imageFailed;
  const imageUri =
    trimmed && !imageFailed ? resolveMediaUrl(trimmed) : null;
  const [loadedUri, setLoadedUri] = useState(imageUri);

  useEffect(() => {
    setImageFailed(false);
  }, [uri]);

  useEffect(() => {
    setLoadedUri(imageUri);
  }, [imageUri]);

  const showDot = presence === "online" || presence === "away";
  const showOfflineDot = presence === "offline";
  const isOnlineHighlight = highlightOnline && presence === "online";

  const avatarCircleStyle = {
    width: size,
    height: size,
    borderRadius: size / 2,
    backgroundColor: colors.muted,
    borderWidth: 1,
    borderColor: colors.border,
  } as const;

  return (
    <View
      style={[
        styles.wrap,
        isOnlineHighlight && {
          padding: 3,
          borderRadius: size / 2 + 3,
          borderWidth: 2.5,
          borderColor: colors.success,
        },
      ]}
    >
      <View style={{ width: size, height: size }}>
        {showPersonPlaceholder ? (
          <View
            style={[
              avatarCircleStyle,
              { alignItems: "center", justifyContent: "center" },
            ]}
          >
            <UserRound
              size={Math.round(size * 0.46)}
              color={colors.mutedForeground}
            />
          </View>
        ) : (
          <Image
            source={{ uri: loadedUri ?? undefined }}
            onError={() => setImageFailed(true)}
            style={avatarCircleStyle}
          />
        )}
        {showDot || showOfflineDot ? (
          <View
            style={[
              styles.dot,
              {
                width: dot,
                height: dot,
                borderRadius: dot / 2,
                backgroundColor: dotColor(
                  presence,
                  colors.success,
                  colors.warning,
                  colors.mutedForeground,
                ),
                borderColor: colors.card,
                borderWidth: 3.5,
              },
            ]}
          />
        ) : null}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: {
    alignItems: "center",
    justifyContent: "center",
  },
  dot: {
    position: "absolute",
    bottom: 0,
    right: 0,
  },
});
