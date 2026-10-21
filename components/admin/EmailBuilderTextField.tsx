import React, { useCallback, useRef, useState } from "react";
import {
  Platform,
  Pressable,
  StyleSheet,
  Text,
  TextInput,
  View,
  type StyleProp,
  type TextStyle,
} from "react-native";
import { EMAIL_BUILDER_EMOJIS } from "@/domains/admin/emailBuilderEmojis";
import { useColors } from "@/hooks/useColors";

interface Props {
  value: string;
  onChangeText: (text: string) => void;
  multiline?: boolean;
  style?: StyleProp<TextStyle>;
  textAlign?: "left" | "right" | "center";
  placeholder?: string;
  autoCapitalize?: "none" | "sentences" | "words" | "characters";
}

function emojiLength(emoji: string): number {
  return [...emoji].length;
}

export function EmailBuilderTextField({
  value,
  onChangeText,
  multiline = false,
  style,
  textAlign = "left",
  placeholder,
  autoCapitalize,
}: Props) {
  const colors = useColors();
  const inputRef = useRef<TextInput>(null);
  const selectionRef = useRef({ start: value.length, end: value.length });
  const [pickerOpen, setPickerOpen] = useState(false);
  const [forcedSelection, setForcedSelection] = useState<{
    start: number;
    end: number;
  } | null>(null);

  const insertEmoji = useCallback(
    (emoji: string) => {
      const { start, end } = selectionRef.current;
      const safeStart = Math.max(0, Math.min(start, value.length));
      const safeEnd = Math.max(safeStart, Math.min(end, value.length));
      const next = value.slice(0, safeStart) + emoji + value.slice(safeEnd);
      onChangeText(next);
      const cursor = safeStart + emojiLength(emoji);
      selectionRef.current = { start: cursor, end: cursor };
      setForcedSelection({ start: cursor, end: cursor });
      setPickerOpen(false);
      inputRef.current?.focus();
    },
    [onChangeText, value],
  );

  if (Platform.OS !== "web") return null;

  return (
    <View style={styles.wrap}>
      <View style={styles.toolbar}>
        <Pressable
          onPress={() => setPickerOpen((open) => !open)}
          style={({ pressed }) => [
            styles.emojiToggle,
            {
              borderColor: pickerOpen ? colors.primary : colors.border,
              backgroundColor: pickerOpen
                ? `${colors.primary}14`
                : pressed
                  ? colors.muted
                  : colors.background,
            },
          ]}
        >
          <Text style={styles.emojiToggleIcon}>😀</Text>
          <Text style={[styles.emojiToggleLabel, { color: colors.foreground }]}>
            Add emoji
          </Text>
        </Pressable>
      </View>

      {pickerOpen ? (
        <View
          style={[
            styles.picker,
            { borderColor: colors.border, backgroundColor: colors.card },
          ]}
        >
          {EMAIL_BUILDER_EMOJIS.map((emoji) => (
            <Pressable
              key={emoji}
              onPress={() => insertEmoji(emoji)}
              style={({ pressed }) => [
                styles.emojiBtn,
                { backgroundColor: pressed ? colors.muted : "transparent" },
              ]}
              accessibilityLabel={`Insert ${emoji}`}
            >
              <Text style={styles.emojiChar}>{emoji}</Text>
            </Pressable>
          ))}
        </View>
      ) : null}

      <TextInput
        ref={inputRef}
        value={value}
        onChangeText={onChangeText}
        multiline={multiline}
        textAlignVertical={multiline ? "top" : "center"}
        placeholder={placeholder}
        autoCapitalize={autoCapitalize}
        textAlign={textAlign}
        onSelectionChange={(event) => {
          selectionRef.current = event.nativeEvent.selection;
          if (forcedSelection) setForcedSelection(null);
        }}
        selection={forcedSelection ?? undefined}
        style={[
          styles.input,
          multiline && styles.multiline,
          {
            color: colors.foreground,
            borderColor: colors.border,
            backgroundColor: colors.background,
            textAlign,
          },
          style,
        ]}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { gap: 8 },
  toolbar: {
    flexDirection: "row",
    alignItems: "center",
  },
  emojiToggle: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    borderWidth: 1,
    borderRadius: 8,
    paddingHorizontal: 10,
    paddingVertical: 6,
    cursor: "pointer" as "auto",
  },
  emojiToggleIcon: { fontSize: 16 },
  emojiToggleLabel: { fontSize: 12, fontWeight: "700" },
  picker: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 2,
    borderWidth: 1,
    borderRadius: 10,
    padding: 8,
  },
  emojiBtn: {
    width: 36,
    height: 36,
    alignItems: "center",
    justifyContent: "center",
    borderRadius: 8,
    cursor: "pointer" as "auto",
  },
  emojiChar: { fontSize: 22, lineHeight: 28 },
  input: {
    borderWidth: 1,
    borderRadius: 10,
    paddingHorizontal: 12,
    paddingVertical: 10,
    fontSize: 14,
  },
  multiline: { minHeight: 88, lineHeight: 20 },
});
