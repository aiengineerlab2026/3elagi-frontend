import React from "react";
import { StyleSheet, View } from "react-native";
import { WebView } from "react-native-webview";
import { UI } from "@/constants/uiTokens";
import { googleMapsEmbedHtml } from "@/components/doctor/doctorProfileLocation";

type Props = {
  query: string;
  height?: number;
};

export function GoogleMapsEmbed({ query, height = 200 }: Props) {
  return (
    <View style={[styles.root, { height, borderRadius: UI.radius.card }]}>
      <WebView
        source={{
          html: googleMapsEmbedHtml(query),
          baseUrl: "https://maps.google.com",
        }}
        style={styles.webview}
        scrollEnabled={false}
        originWhitelist={["*"]}
        javaScriptEnabled
        domStorageEnabled
        setSupportMultipleWindows={false}
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
  webview: {
    flex: 1,
    backgroundColor: "transparent",
  },
});
