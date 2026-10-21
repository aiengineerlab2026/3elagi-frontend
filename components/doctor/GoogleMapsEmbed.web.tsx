import React from "react";
import { StyleSheet, View } from "react-native";
import { UI } from "@/constants/uiTokens";
import { googleMapsEmbedUrl } from "@/components/doctor/doctorProfileLocation";

type Props = {
  query: string;
  height?: number;
};

export function GoogleMapsEmbed({ query, height = 200 }: Props) {
  return (
    <View style={[styles.root, { height, borderRadius: UI.radius.card }]}>
      <iframe
        src={googleMapsEmbedUrl(query)}
        style={styles.iframe}
        loading="lazy"
        referrerPolicy="no-referrer-when-downgrade"
        title="Clinic location map"
      />
    </View>
  );
}

const styles = StyleSheet.create({
  root: {
    width: "100%",
    overflow: "hidden",
    backgroundColor: "#e8edf5",
  },
  iframe: {
    borderWidth: 0,
    width: "100%",
    height: "100%",
  } as unknown as import("react-native").ViewStyle,
});
