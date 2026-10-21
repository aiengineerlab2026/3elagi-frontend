import { Image } from "expo-image";
import React from "react";
import { StyleSheet, type ImageStyle, type StyleProp } from "react-native";

interface Props {
  uri: string;
  style?: StyleProp<ImageStyle>;
  contentFit?: "cover" | "contain";
}

export function MedicalRecordAttachmentImage({
  uri,
  style,
  contentFit = "cover",
}: Props) {
  return (
    <Image
      source={{ uri }}
      style={[styles.image, style]}
      contentFit={contentFit}
      transition={120}
    />
  );
}

const styles = StyleSheet.create({
  image: { width: "100%", height: "100%" },
});
