import { MoreVertical, Plus, X } from "lucide-react-native";
import React, { useRef, useState } from "react";
import {
  Modal,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  useWindowDimensions,
  View,
  type LayoutRectangle,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useColors } from "@/hooks/useColors";
import { chatFlexRow } from "@/utils/rtl";

export interface ChatAction {
  key: string;
  label: string;
  Icon: React.ComponentType<{ size?: number; color?: string }>;
  onPress: () => void;
  /** Accent color; defaults to the theme primary. */
  color?: string;
  disabled?: boolean;
}

interface Props {
  isRTL: boolean;
  actions: ChatAction[];
  disabled?: boolean;
  /** Composer button sizing (mobile web uses a smaller icon button). */
  buttonStyle?: object;
  /** Header toolbar uses a bordered square with ⋮ instead of the composer +. */
  trigger?: "plus" | "more";
}

const MENU_MAX_WIDTH = 320;
const MENU_GAP = 8;

/** Composer plus button — opens an anchored context window with chat action pills. */
export function ChatActionsMenu({
  isRTL,
  actions,
  disabled,
  buttonStyle,
  trigger = "plus",
}: Props) {
  const colors = useColors();
  const insets = useSafeAreaInsets();
  const { width: windowWidth, height: windowHeight } = useWindowDimensions();
  const [open, setOpen] = useState(false);
  const [anchor, setAnchor] = useState<LayoutRectangle | null>(null);
  const buttonRef = useRef<View>(null);
  const dir = chatFlexRow();

  if (!actions.length) return null;

  const openMenu = () => {
    buttonRef.current?.measureInWindow((x, y, width, height) => {
      setAnchor({ x, y, width, height });
      setOpen(true);
    });
  };

  const closeMenu = () => setOpen(false);

  const runAction = (onPress: () => void) => {
    closeMenu();
    // Let this modal finish closing before opening nested pickers — stacking
    // two RN-web modals in the same frame often swallows the second one.
    const delay = Platform.OS === "web" ? 150 : 16;
    setTimeout(() => onPress(), delay);
  };

  // Native gets a bottom sheet: an anchored popup next to a composer button
  // sits awkwardly over the keyboard and the system navigation bar.
  const isSheet = Platform.OS !== "web";

  const menuWidth = Math.min(MENU_MAX_WIDTH, windowWidth - 24);
  let menuStyle: object | undefined;
  if (isSheet) {
    menuStyle = {
      position: "absolute" as const,
      left: 0,
      right: 0,
      bottom: 0,
      width: "100%" as const,
      borderBottomLeftRadius: 0,
      borderBottomRightRadius: 0,
      borderTopLeftRadius: 22,
      borderTopRightRadius: 22,
      paddingBottom: insets.bottom + 8,
      maxHeight: windowHeight * 0.7,
    };
  } else if (anchor) {
    const preferredTop = anchor.y - MENU_GAP;
    const openAbove = preferredTop > 140;
    const left = Math.min(
      Math.max(12, isRTL ? anchor.x + anchor.width - menuWidth : anchor.x),
      windowWidth - menuWidth - 12,
    );
    menuStyle = {
      position: "absolute" as const,
      width: menuWidth,
      left,
      ...(openAbove
        ? { bottom: windowHeight - preferredTop }
        : { top: anchor.y + anchor.height + MENU_GAP }),
      maxHeight: Math.min(
        windowHeight * 0.55,
        openAbove
          ? Math.max(160, preferredTop - insets.top - 12)
          : Math.max(
              160,
              windowHeight - (anchor.y + anchor.height + MENU_GAP) - insets.bottom - 12,
            ),
      ),
    };
  }

  const TriggerIcon = trigger === "more" ? MoreVertical : Plus;
  const triggerBaseStyle =
    trigger === "more"
      ? {
          width: 36,
          height: 36,
          borderRadius: 8,
          borderWidth: 1,
          alignItems: "center" as const,
          justifyContent: "center" as const,
          backgroundColor: colors.card,
        }
      : styles.button;

  return (
    <>
      <View ref={buttonRef} collapsable={false}>
        <Pressable
          onPress={openMenu}
          disabled={disabled}
          accessibilityRole="button"
          accessibilityLabel={isRTL ? "إجراءات المحادثة" : "Chat actions"}
          hitSlop={6}
          style={[
            buttonStyle ?? triggerBaseStyle,
            trigger === "more"
              ? { borderColor: "#E2E8F0" }
              : {
                  backgroundColor: colors.muted,
                  borderColor: colors.border,
                },
            { opacity: disabled ? 0.45 : 1 },
          ]}
        >
          <TriggerIcon size={trigger === "more" ? 18 : 20} color={colors.foreground} />
        </Pressable>
      </View>

      <Modal
        visible={open}
        transparent
        animationType={isSheet ? "slide" : "fade"}
        onRequestClose={closeMenu}
        statusBarTranslucent
        navigationBarTranslucent
      >
        <View style={styles.overlay}>
          <Pressable style={StyleSheet.absoluteFill} onPress={closeMenu} />
          <View
            style={[
              styles.menu,
              {
                backgroundColor: colors.card,
                borderColor: colors.border,
                shadowColor: "#0f172a",
              },
              menuStyle,
            ]}
          >
            <View style={[styles.head, { flexDirection: dir }]}>
              <Text style={[styles.title, { color: colors.foreground }]}>
                {isRTL ? "إجراءات" : "Actions"}
              </Text>
              <Pressable onPress={closeMenu} hitSlop={8}>
                <X size={18} color={colors.foreground} />
              </Pressable>
            </View>

            <ScrollView
              keyboardShouldPersistTaps="handled"
              showsVerticalScrollIndicator={false}
              bounces={false}
            >
              {actions.map(({ key, label, Icon, onPress, color, disabled: rowDisabled }) => {
                const tint = color ?? colors.primary;
                return (
                  <Pressable
                    key={key}
                    disabled={rowDisabled}
                    onPress={() => runAction(onPress)}
                    style={({ pressed }) => [
                      styles.row,
                      {
                        flexDirection: dir,
                        backgroundColor: pressed ? colors.muted : "transparent",
                        opacity: rowDisabled ? 0.45 : 1,
                      },
                    ]}
                  >
                    <View style={[styles.iconWrap, { backgroundColor: `${tint}12` }]}>
                      <Icon size={18} color={tint} />
                    </View>
                    <Text style={[styles.rowLabel, { color: colors.foreground }]}>{label}</Text>
                  </Pressable>
                );
              })}
            </ScrollView>
          </View>
        </View>
      </Modal>
    </>
  );
}

const styles = StyleSheet.create({
  button: {
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: "center",
    justifyContent: "center",
  },
  overlay: {
    flex: 1,
    backgroundColor: "rgba(15, 23, 42, 0.28)",
  },
  menu: {
    borderRadius: 16,
    borderWidth: 1,
    paddingHorizontal: 8,
    paddingTop: 10,
    paddingBottom: 8,
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.18,
    shadowRadius: 20,
    elevation: 12,
    overflow: "hidden",
  },
  head: {
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: 4,
    paddingHorizontal: 6,
  },
  title: { fontSize: 15, fontWeight: "800" },
  row: {
    alignItems: "center",
    gap: 10,
    paddingVertical: 10,
    paddingHorizontal: 6,
    borderRadius: 12,
  },
  iconWrap: {
    width: 34,
    height: 34,
    borderRadius: 10,
    alignItems: "center",
    justifyContent: "center",
  },
  rowLabel: { flex: 1, fontSize: 14, fontWeight: "600" },
});
