import React, { useCallback, useEffect, useRef, useState } from "react";
import { Platform, Pressable, StyleSheet, Text, TextInput, View } from "react-native";
import { useColors } from "@/hooks/useColors";

type EditorMode = "rich" | "html";

interface Props {
  value: string;
  onChange: (html: string) => void;
  dir?: "ltr" | "rtl";
  placeholder?: string;
}

function exec(command: string, value?: string) {
  if (typeof document === "undefined") return;
  document.execCommand(command, false, value);
}

export function MarketingHtmlEditor({
  value,
  onChange,
  dir = "ltr",
  placeholder = "Write the email body…",
}: Props) {
  const colors = useColors();
  const editorRef = useRef<HTMLDivElement | null>(null);
  const [mode, setMode] = useState<EditorMode>("rich");
  const [htmlDraft, setHtmlDraft] = useState(value);
  const syncingRef = useRef(false);

  const emitEditorHtml = useCallback(() => {
    const el = editorRef.current;
    if (!el || syncingRef.current) return;
    onChange(el.innerHTML);
  }, [onChange]);

  useEffect(() => {
    if (mode !== "rich") return;
    const el = editorRef.current;
    if (!el) return;
    if (el.innerHTML !== value) {
      syncingRef.current = true;
      el.innerHTML = value || "";
      syncingRef.current = false;
    }
  }, [value, mode]);

  useEffect(() => {
    if (mode === "html") {
      setHtmlDraft(value);
    }
  }, [value, mode]);

  if (Platform.OS !== "web") {
    return null;
  }

  const toolbarBtn = (label: string, onPress: () => void, key: string) => (
    <Pressable
      key={key}
      onPress={onPress}
      style={({ pressed }) => [
        styles.toolBtn,
        {
          borderColor: colors.border,
          backgroundColor: pressed ? colors.muted : colors.background,
        },
      ]}
    >
      <Text style={[styles.toolBtnText, { color: colors.foreground }]}>{label}</Text>
    </Pressable>
  );

  return (
    <View
      style={[
        styles.wrap,
        { borderColor: colors.border, backgroundColor: colors.background },
      ]}
    >
      <View style={[styles.toolbar, { borderBottomColor: colors.border, backgroundColor: colors.card }]}>
        <View style={styles.toolbarRow}>
          {mode === "rich" ? (
            <>
              {toolbarBtn("B", () => exec("bold"), "bold")}
              {toolbarBtn("I", () => exec("italic"), "italic")}
              {toolbarBtn("U", () => exec("underline"), "underline")}
              {toolbarBtn("H2", () => exec("formatBlock", "h2"), "h2")}
              {toolbarBtn("H3", () => exec("formatBlock", "h3"), "h3")}
              {toolbarBtn("• List", () => exec("insertUnorderedList"), "ul")}
              {toolbarBtn("1. List", () => exec("insertOrderedList"), "ol")}
              {toolbarBtn("Link", () => {
                const url = window.prompt("Link URL");
                if (url?.trim()) exec("createLink", url.trim());
              }, "link")}
              {toolbarBtn("Clear", () => exec("removeFormat"), "clear")}
            </>
          ) : null}
        </View>
        <View style={styles.modeRow}>
          <Pressable
            onPress={() => setMode("rich")}
            style={[
              styles.modeBtn,
              {
                backgroundColor: mode === "rich" ? `${colors.primary}18` : "transparent",
                borderColor: mode === "rich" ? colors.primary : colors.border,
              },
            ]}
          >
            <Text
              style={{
                color: mode === "rich" ? colors.primary : colors.mutedForeground,
                fontWeight: mode === "rich" ? "800" : "600",
                fontSize: 12,
              }}
            >
              Rich text
            </Text>
          </Pressable>
          <Pressable
            onPress={() => {
              if (mode === "rich" && editorRef.current) {
                onChange(editorRef.current.innerHTML);
              }
              setMode("html");
              setHtmlDraft(value);
            }}
            style={[
              styles.modeBtn,
              {
                backgroundColor: mode === "html" ? `${colors.primary}18` : "transparent",
                borderColor: mode === "html" ? colors.primary : colors.border,
              },
            ]}
          >
            <Text
              style={{
                color: mode === "html" ? colors.primary : colors.mutedForeground,
                fontWeight: mode === "html" ? "800" : "600",
                fontSize: 12,
              }}
            >
              HTML
            </Text>
          </Pressable>
        </View>
      </View>

      {mode === "rich" ? (
        <div
          ref={editorRef}
          contentEditable
          suppressContentEditableWarning
          dir={dir}
          onInput={emitEditorHtml}
          onBlur={emitEditorHtml}
          data-placeholder={placeholder}
          style={{
            minHeight: 320,
            padding: 16,
            outline: "none",
            color: colors.foreground,
            fontSize: 15,
            lineHeight: 1.65,
            direction: dir,
            textAlign: dir === "rtl" ? "right" : "left",
            fontFamily: "'Segoe UI', Tahoma, Arial, sans-serif",
          }}
        />
      ) : (
        <TextInput
          value={htmlDraft}
          onChangeText={setHtmlDraft}
          onBlur={() => onChange(htmlDraft)}
          multiline
          textAlignVertical="top"
          autoCapitalize="none"
          autoCorrect={false}
          spellCheck={false}
          style={[
            styles.htmlInput,
            {
              color: colors.foreground,
              fontFamily: Platform.OS === "web" ? "monospace" : undefined,
            },
          ]}
        />
      )}

      <Text style={[styles.hint, { color: colors.mutedForeground }]}>
        Use {"{{name}}"} where the doctor&apos;s name should appear. The 3elagi header and
        marketing signature are added automatically when sending.
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: {
    borderWidth: 1,
    borderRadius: 12,
    overflow: "hidden",
    marginTop: 4,
  },
  toolbar: {
    borderBottomWidth: 1,
    padding: 10,
    gap: 10,
  },
  toolbarRow: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 6,
  },
  toolBtn: {
    borderWidth: 1,
    borderRadius: 8,
    paddingHorizontal: 10,
    paddingVertical: 6,
    cursor: "pointer" as "auto",
  },
  toolBtnText: {
    fontSize: 12,
    fontWeight: "700",
  },
  modeRow: {
    flexDirection: "row",
    gap: 8,
  },
  modeBtn: {
    borderWidth: 1,
    borderRadius: 8,
    paddingHorizontal: 10,
    paddingVertical: 6,
    cursor: "pointer" as "auto",
  },
  htmlInput: {
    minHeight: 320,
    padding: 16,
    fontSize: 13,
    lineHeight: 20,
  },
  hint: {
    fontSize: 11,
    lineHeight: 16,
    paddingHorizontal: 12,
    paddingBottom: 10,
  },
});
