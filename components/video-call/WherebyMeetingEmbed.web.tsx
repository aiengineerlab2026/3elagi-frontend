import React from "react";
import { StyleSheet, View } from "react-native";

interface Props {
  roomUrl: string;
  embedUrl: string;
}

export function WherebyMeetingEmbed({ embedUrl }: Props) {
  return (
    <View style={styles.root}>
      <iframe
        src={embedUrl}
        allow="camera; microphone; fullscreen; display-capture; autoplay"
        // Absolute fill — % height on iframe often collapses on mobile web.
        style={styles.iframe}
        title="3elagi video call"
      />
    </View>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
    minHeight: 0,
    width: "100%",
    height: "100%",
    overflow: "hidden",
    backgroundColor: "#0f172a",
    position: "relative",
  },
  iframe: {
    position: "absolute",
    top: 0,
    right: 0,
    bottom: 0,
    left: 0,
    borderWidth: 0,
    width: "100%",
    height: "100%",
  } as unknown as import("react-native").ViewStyle,
});
