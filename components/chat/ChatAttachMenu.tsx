import { Camera, Image as ImageIcon, ScanLine, Video, X } from "lucide-react-native";
import React, { useEffect, useRef } from "react";
import {
  InteractionManager,
  Modal,
  Platform,
  Pressable,
  StyleSheet,
  Text,
  View,
} from "react-native";
import { useColors } from "@/hooks/useColors";
import { useWebLayout } from "@/hooks/useWebLayout";
import { isDocumentScannerAvailable } from "@/utils/documentScanner";
import { flexRow } from "@/utils/rtl";

export type ChatAttachMode = "photo" | "video" | "all";

interface Props {
  visible: boolean;
  isRTL: boolean;
  mode?: ChatAttachMode;
  onClose: () => void;
  onPhotoGallery: () => void;
  onPhotoCamera: () => void;
  /** Native only: camera in document-scan mode (edge detect + crop). */
  onScanDocument?: () => void;
  onVideoGallery: () => void;
  onVideoCamera: () => void;
}

export function ChatAttachMenu({
  visible,
  isRTL,
  mode = "all",
  onClose,
  onPhotoGallery,
  onPhotoCamera,
  onScanDocument,
  onVideoGallery,
  onVideoCamera,
}: Props) {
  const colors = useColors();
  const { isMobile } = useWebLayout();
  const dir = flexRow(isRTL);
  const isWeb = Platform.OS === "web";
  const isMobileWeb = isWeb && isMobile;
  const pendingActionRef = useRef<(() => void) | null>(null);

  const showPhoto = mode === "all" || mode === "photo";
  const showVideo = mode === "all" || mode === "video";

  useEffect(() => {
    if (visible || !pendingActionRef.current) return;

    const action = pendingActionRef.current;
    pendingActionRef.current = null;

    const task = InteractionManager.runAfterInteractions(() => {
      const delay = Platform.OS === "android" ? 400 : 200;
      setTimeout(action, delay);
    });

    return () => task.cancel();
  }, [visible]);

  const title =
    mode === "photo"
      ? isRTL
        ? "إرفاق صورة"
        : "Attach photo"
      : mode === "video"
        ? isRTL
          ? "إرفاق فيديو"
          : "Attach video"
        : isRTL
          ? "إرفاق ملف"
          : "Attach";

  const run = (action: () => void) => {
    // Mobile web: open the file/camera picker while the tap gesture is still active.
    if (isMobileWeb) {
      action();
      onClose();
      return;
    }
    if (isWeb) {
      onClose();
      action();
      return;
    }
    pendingActionRef.current = action;
    onClose();
  };

  return (
    <Modal visible={visible} animationType="fade" transparent onRequestClose={onClose}>
      <View
        style={[
          styles.overlay,
          isWeb && !isMobileWeb && styles.overlayWeb,
        ]}
      >
        <Pressable style={styles.backdrop} onPress={onClose} accessibilityLabel="Close" />
        <View
          style={[
            styles.sheet,
            {
              backgroundColor: colors.card,
              borderColor: colors.border,
            },
            isWeb && !isMobileWeb && styles.sheetWeb,
          ]}
        >
          <View style={[styles.header, { flexDirection: dir }]}>
            <Text style={[styles.title, { color: colors.foreground }]}>{title}</Text>
            <Pressable onPress={onClose} hitSlop={8}>
              <X size={20} color={colors.foreground} />
            </Pressable>
          </View>

          {showPhoto ? (
            <>
              <MenuRow
                icon={<ImageIcon size={20} color={colors.primary} />}
                label={isRTL ? "صورة من المعرض" : "Photo from gallery"}
                onPress={() => run(onPhotoGallery)}
                colors={colors}
                dir={dir}
              />
              {!isWeb || isMobileWeb ? (
                <MenuRow
                  icon={<Camera size={20} color={colors.primary} />}
                  label={isRTL ? "التقاط صورة" : "Photo from camera"}
                  onPress={() => run(onPhotoCamera)}
                  colors={colors}
                  dir={dir}
                />
              ) : null}
              {onScanDocument && isDocumentScannerAvailable ? (
                <MenuRow
                  icon={<ScanLine size={20} color={colors.primary} />}
                  label={isRTL ? "مسح مستند بالكاميرا" : "Scan document"}
                  onPress={() => run(onScanDocument)}
                  colors={colors}
                  dir={dir}
                />
              ) : null}
            </>
          ) : null}

          {showPhoto && showVideo ? (
            <View style={[styles.divider, { backgroundColor: colors.border }]} />
          ) : null}

          {showVideo ? (
            <>
              <MenuRow
                icon={<Video size={20} color={colors.primary} />}
                label={
                  isRTL ? "فيديو من المعرض (حد أقصى دقيقة)" : "Video from gallery (max 1 min)"
                }
                onPress={() => run(onVideoGallery)}
                colors={colors}
                dir={dir}
              />
              {!isWeb || isMobileWeb ? (
                <MenuRow
                  icon={<Camera size={20} color={colors.primary} />}
                  label={
                    isRTL
                      ? "فيديو من الكاميرا (حد أقصى دقيقة)"
                      : "Video from camera (max 1 min)"
                  }
                  onPress={() => run(onVideoCamera)}
                  colors={colors}
                  dir={dir}
                />
              ) : null}
            </>
          ) : null}
        </View>
      </View>
    </Modal>
  );
}

function MenuRow({
  icon,
  label,
  onPress,
  colors,
  dir,
}: {
  icon: React.ReactNode;
  label: string;
  onPress: () => void;
  colors: ReturnType<typeof useColors>;
  dir: "row" | "row-reverse";
}) {
  return (
    <Pressable
      onPress={onPress}
      style={({ pressed }) => [
        styles.row,
        {
          flexDirection: dir,
          backgroundColor: pressed ? colors.muted : "transparent",
        },
      ]}
    >
      <View style={[styles.iconWrap, { backgroundColor: `${colors.primary}12` }]}>{icon}</View>
      <Text style={[styles.rowLabel, { color: colors.foreground }]}>{label}</Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    justifyContent: "flex-end",
    backgroundColor: "rgba(0,0,0,0.4)",
  },
  overlayWeb: {
    justifyContent: "center",
    alignItems: "center",
    padding: 24,
    ...(Platform.OS === "web"
      ? ({
          position: "fixed",
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          zIndex: 9999,
        } as object)
      : null),
  },
  backdrop: {
    ...StyleSheet.absoluteFillObject,
    cursor: "pointer" as "auto",
  },
  sheet: {
    borderTopLeftRadius: 18,
    borderTopRightRadius: 18,
    paddingHorizontal: 16,
    paddingTop: 14,
    paddingBottom: 24,
    borderWidth: 1,
    zIndex: 1,
  },
  sheetWeb: {
    width: "100%",
    maxWidth: 420,
    borderRadius: 16,
    borderTopLeftRadius: 16,
    borderTopRightRadius: 16,
  },
  header: {
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: 8,
  },
  title: {
    fontSize: 17,
    fontWeight: "800",
  },
  divider: {
    height: StyleSheet.hairlineWidth,
    marginVertical: 6,
  },
  row: {
    alignItems: "center",
    gap: 12,
    paddingVertical: 12,
    paddingHorizontal: 4,
    borderRadius: 12,
    cursor: "pointer" as "auto",
  },
  iconWrap: {
    width: 40,
    height: 40,
    borderRadius: 10,
    alignItems: "center",
    justifyContent: "center",
  },
  rowLabel: {
    flex: 1,
    fontSize: 15,
    fontWeight: "600",
  },
});
