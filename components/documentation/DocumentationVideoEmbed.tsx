import React from "react";
import { Linking, Pressable, StyleSheet, Text, View } from "react-native";
import { WebView } from "react-native-webview";
import { youtubeEmbedUrl, youtubeWatchUrl } from "@/constants/documentationVideos";
import { UI } from "@/constants/uiTokens";
import { useColors } from "@/hooks/useColors";
import { useI18n } from "@/hooks/useI18n";
import { alignText } from "@/utils/rtl";

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
  const colors = useColors();
  const { t, isRTL } = useI18n();
  const textAlign = alignText(isRTL);

  return (
    <View style={[styles.wrap, { gap: 8 }]}>
      <View style={[styles.root, { height, borderRadius: UI.radius.card }]}>
        <WebView
          source={{ uri: youtubeEmbedUrl(youtubeId) }}
          style={styles.webview}
          allowsFullscreenVideo
          mediaPlaybackRequiresUserAction={false}
          javaScriptEnabled
          originWhitelist={["https://*"]}
          accessibilityLabel={title}
        />
      </View>
      <Pressable
        onPress={() => void Linking.openURL(youtubeWatchUrl(youtubeId))}
        style={({ pressed }) => [{ opacity: pressed ? 0.85 : 1 }]}
      >
        <Text style={[styles.link, { color: colors.primary, textAlign }]}>
          {t.documentation.openOnYouTube}
        </Text>
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: {
    width: "100%",
  },
  root: {
    width: "100%",
    overflow: "hidden",
    backgroundColor: "#0f1419",
  },
  webview: {
    flex: 1,
    backgroundColor: "transparent",
  },
  link: {
    fontSize: 13,
    fontWeight: "600",
  },
});
