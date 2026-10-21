import React from "react";
import { Modal, Platform, Pressable, StyleSheet, View } from "react-native";
import { KeyboardAvoidingView } from "react-native-keyboard-controller";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import {
  DiagnosisChatForm,
  type DiagnosisChatFormProps,
} from "@/components/DiagnosisChatForm";
import { useColors } from "@/hooks/useColors";

type Props = DiagnosisChatFormProps;

export function DiagnosisChatModal(props: Props) {
  const colors = useColors();
  const insets = useSafeAreaInsets();
  const { visible, onClose, saving = false } = props;
  const isWeb = Platform.OS === "web";

  if (isWeb) {
    return (
      <Modal visible={visible} animationType="fade" transparent onRequestClose={onClose}>
        <View style={styles.webOverlay} accessibilityViewIsModal>
          <Pressable
            style={styles.webBackdrop}
            onPress={onClose}
            disabled={saving}
            accessibilityRole="button"
            accessibilityLabel="Close"
          />
          <View
            style={[
              styles.webDialog,
              {
                backgroundColor: colors.card,
                borderColor: colors.border,
              },
            ]}
          >
            <DiagnosisChatForm {...props} />
          </View>
        </View>
      </Modal>
    );
  }

  return (
    <Modal visible={visible} animationType="slide" transparent onRequestClose={onClose}>
      <KeyboardAvoidingView
        style={styles.nativeOverlay}
        behavior="padding"
        keyboardVerticalOffset={insets.top}
      >
        <Pressable style={styles.nativeDismiss} onPress={onClose} disabled={saving} />
        <View
          style={[
            styles.nativeSheet,
            { backgroundColor: colors.card, paddingBottom: Math.max(insets.bottom, 16) },
          ]}
        >
          <DiagnosisChatForm {...props} />
        </View>
      </KeyboardAvoidingView>
    </Modal>
  );
}

const styles = StyleSheet.create({
  webOverlay: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    padding: 24,
    backgroundColor: "rgba(15, 23, 42, 0.48)",
    ...(Platform.OS === "web"
      ? ({
          position: "fixed",
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          width: "100%",
          height: "100%",
          zIndex: 9999,
        } as object)
      : null),
  },
  webBackdrop: {
    ...StyleSheet.absoluteFillObject,
    cursor: "pointer" as "auto",
  },
  webDialog: {
    width: "100%",
    maxWidth: 560,
    maxHeight: "min(72vh, 600px)" as unknown as number,
    borderRadius: 20,
    borderWidth: 1,
    paddingTop: 16,
    paddingHorizontal: 20,
    paddingBottom: 20,
    zIndex: 1,
    shadowColor: "#0f172a",
    shadowOffset: { width: 0, height: 18 },
    shadowOpacity: 0.22,
    shadowRadius: 36,
    elevation: 16,
    overflow: "hidden",
    cursor: "auto" as "auto",
  },
  nativeOverlay: {
    flex: 1,
    justifyContent: "flex-end",
    backgroundColor: "rgba(0,0,0,0.35)",
  },
  nativeDismiss: { flex: 1 },
  nativeSheet: {
    borderTopLeftRadius: 18,
    borderTopRightRadius: 18,
    paddingTop: 16,
    paddingHorizontal: 16,
    maxHeight: "72%",
  },
});
