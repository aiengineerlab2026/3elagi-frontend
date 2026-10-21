import React from "react";
import { StyleSheet, View } from "react-native";
import { youtubeEmbedUrl } from "@/constants/documentationVideos";
import { UI } from "@/constants/uiTokens";

type Props = {
  youtubeId: string;
  title: string;
  height?: number;
};

export function DocumentationVideoEmbed({
  youtubeId,
  title,
  height = 480,
}: Props) {
  return (
    <View style={[styles.root, { height, borderRadius: UI.radius.card }]}>
      <iframe
        src={youtubeEmbedUrl(youtubeId)}
        style={styles.iframe}
        allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share"
        allowFullScreen
        title={title}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  root: {
    width: "100%",
    overflow: "hidden",
    backgroundColor: "#0f1419",
  },
  iframe: {
    borderWidth: 0,
    width: "100%",
    height: "100%",
  } as unknown as import("react-native").ViewStyle,
});
