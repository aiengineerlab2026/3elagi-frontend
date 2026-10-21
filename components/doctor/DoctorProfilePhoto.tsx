import { UserRound } from "lucide-react-native";
import React, { useEffect, useState } from "react";
import { Image, StyleSheet, View } from "react-native";
import { resolveMediaUrl } from "@/domains/chat/avatar";
import { useColors } from "@/hooks/useColors";

interface Props {
  /** Absolute URL from `photo_url` in the doctor profile API response. */
  photoUrl?: string | null;
  userId: string;
  size?: number;
}

/** Web doctor profile hero photo — uses API `photo_url` when provided. */
export function DoctorProfilePhoto({ photoUrl, userId, size = 96 }: Props) {
  const colors = useColors();
  const trimmed = photoUrl?.trim();
  const [imageFailed, setImageFailed] = useState(false);
  const showPlaceholder = !trimmed || imageFailed;
  const uri = trimmed ? resolveMediaUrl(trimmed) : null;

  useEffect(() => {
    setImageFailed(false);
  }, [photoUrl]);

  return (
    <View style={[styles.wrap, { width: size, height: size }]}>
      {showPlaceholder ? (
        <View
          style={[
            styles.image,
            {
              width: size,
              height: size,
              borderRadius: size / 2,
              borderColor: colors.border,
              backgroundColor: colors.muted,
              alignItems: "center",
              justifyContent: "center",
            },
          ]}
          accessibilityLabel="Doctor profile photo"
        >
          <UserRound
            size={Math.round(size * 0.46)}
            color={colors.mutedForeground}
          />
        </View>
      ) : (
        <Image
          key={uri ?? userId}
          source={{ uri: uri ?? undefined }}
          onError={() => setImageFailed(true)}
          style={[
            styles.image,
            {
              width: size,
              height: size,
              borderRadius: size / 2,
              borderColor: colors.border,
              backgroundColor: colors.muted,
            },
          ]}
          resizeMode="cover"
          accessibilityLabel="Doctor profile photo"
        />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: {
    alignItems: "center",
    justifyContent: "center",
    flexShrink: 0,
    overflow: "hidden",
    borderRadius: 999,
  },
  image: {
    borderWidth: 1,
  },
});
