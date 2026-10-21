import { Download, X } from "lucide-react-native";
import React from "react";
import {
  ActivityIndicator,
  Linking,
  Modal,
  Platform,
  Pressable,
  StyleSheet,
  Text,
  View,
} from "react-native";
import { WebView } from "react-native-webview";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useColors } from "@/hooks/useColors";

export type MedicalPdfView = {
  uri: string;
  fileName?: string | null;
};

type Props = {
  view: MedicalPdfView | null;
  onClose: () => void;
  isRTL?: boolean;
};

async function downloadPdf(uri: string, fileName?: string | null): Promise<void> {
  const name = fileName?.trim() || "document.pdf";

  if (Platform.OS === "web") {
    const link = document.createElement("a");
    link.href = uri;
    link.download = name;
    link.target = "_blank";
    link.rel = "noopener noreferrer";
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    return;
  }

  await Linking.openURL(uri);
}

export function MedicalPdfViewer({ view, onClose, isRTL = false }: Props) {
  const colors = useColors();
  const insets = useSafeAreaInsets();
  const dir = isRTL ? "row-reverse" : "row";

  if (!view) return null;

  return (
    <Modal
      visible
      transparent
      animationType="fade"
      onRequestClose={onClose}
      statusBarTranslucent
    >
      <View style={styles.backdrop}>
        <View
          style={[
            styles.sheet,
            {
              marginTop: insets.top + 8,
              marginBottom: insets.bottom + 8,
              backgroundColor: colors.card,
              borderColor: colors.border,
            },
          ]}
        >
          <View style={[styles.toolbar, { flexDirection: dir, borderBottomColor: colors.border }]}>
            <Pressable
              accessibilityRole="button"
              accessibilityLabel={isRTL ? "تحميل" : "Download"}
              onPress={() => {
                void downloadPdf(view.uri, view.fileName);
              }}
              style={({ pressed, hovered }) => [
                styles.toolbarBtn,
                {
                  flexDirection: dir,
                  backgroundColor: pressed || hovered ? colors.muted : "transparent",
                },
              ]}
            >
              <Download size={18} color={colors.primary} />
              <Text style={[styles.toolbarBtnText, { color: colors.primary }]}>
                {isRTL ? "تحميل" : "Download"}
              </Text>
            </Pressable>

            <Pressable
              accessibilityRole="button"
              accessibilityLabel={isRTL ? "إغلاق" : "Close"}
              onPress={onClose}
              style={({ pressed, hovered }) => [
                styles.closeBtn,
                {
                  backgroundColor: pressed || hovered ? colors.muted : "transparent",
                },
              ]}
            >
              <X size={22} color={colors.foreground} />
            </Pressable>
          </View>

          <View style={styles.viewer}>
            {Platform.OS === "web" ? (
              // eslint-disable-next-line react/no-unknown-property
              <iframe
                src={view.uri}
                title={view.fileName?.trim() || "PDF document"}
                style={styles.iframe as unknown as import("react-native").ViewStyle}
              />
            ) : (
              <WebView
                source={{ uri: view.uri }}
                style={styles.webview}
                startInLoadingState
                renderLoading={() => (
                  <View style={styles.loading}>
                    <ActivityIndicator size="large" color={colors.primary} />
                  </View>
                )}
              />
            )}
          </View>
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  backdrop: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.55)",
    paddingHorizontal: 12,
  },
  sheet: {
    flex: 1,
    borderWidth: 1,
    borderRadius: 16,
    overflow: "hidden",
  },
  toolbar: {
    alignItems: "center",
    justifyContent: "space-between",
    gap: 12,
    paddingHorizontal: 12,
    paddingVertical: 10,
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
  toolbarBtn: {
    alignItems: "center",
    gap: 8,
    paddingHorizontal: 10,
    paddingVertical: 8,
    borderRadius: 10,
  },
  toolbarBtnText: {
    fontSize: 15,
    fontWeight: "700",
  },
  closeBtn: {
    alignItems: "center",
    justifyContent: "center",
    width: 40,
    height: 40,
    borderRadius: 20,
  },
  viewer: {
    flex: 1,
    minHeight: 0,
    width: "100%",
    backgroundColor: "#f1f5f9",
  },
  iframe: {
    borderWidth: 0,
    width: "100%",
    height: "100%",
  },
  webview: {
    flex: 1,
    backgroundColor: "#f1f5f9",
  },
  loading: {
    ...StyleSheet.absoluteFillObject,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "#f1f5f9",
  },
});
