import React, { useEffect, useMemo, useRef, useState } from "react";
import {
  ActivityIndicator,
  Platform,
  StyleSheet,
  Text,
  useWindowDimensions,
  View,
} from "react-native";
import { WebView } from "react-native-webview";
import {
  fetchAdminDoctorWelcomePreview,
  fetchAdminInvitedDoctorPreview,
  fetchAdminMarketingPreview,
  type MarketingEmailLanguage,
  type MarketingEmailTheme,
} from "@/domains/admin/api";
import type { MarketingEmailSection } from "@/domains/admin/marketingSections";
import { useColors } from "@/hooks/useColors";

interface Props {
  accessToken: string;
  sections: MarketingEmailSection[];
  language: MarketingEmailLanguage;
  themeColor: MarketingEmailTheme;
  previewName: string;
  active: boolean;
  previewKind?: "marketing" | "doctor-welcome" | "invited-doctor";
  previewEmail?: string;
  previewPassword?: string;
}

/** Ensure email HTML scrolls inside the native WebView preview. */
function prepareEmailPreviewHtml(html: string): string {
  const headInjection =
    '<meta name="viewport" content="width=device-width, initial-scale=1.0, maximum-scale=1.0">' +
    "<style>html,body{margin:0;padding:0;}body{overflow-y:auto;-webkit-overflow-scrolling:touch;}</style>";

  if (/<html[\s>]/i.test(html)) {
    if (/<head[\s>]/i.test(html)) {
      return html.replace(/<head[^>]*>/i, (match) => `${match}${headInjection}`);
    }
    return html.replace(/<html[^>]*>/i, (match) => `${match}<head>${headInjection}</head>`);
  }

  return `<!DOCTYPE html><html><head>${headInjection}</head><body>${html}</body></html>`;
}

export function MarketingEmailPreview({
  accessToken,
  sections,
  language,
  themeColor,
  previewName,
  active,
  previewKind = "marketing",
  previewEmail,
  previewPassword,
}: Props) {
  const colors = useColors();
  const { height: windowHeight } = useWindowDimensions();
  const previewFrameHeight = useMemo(
    () =>
      Platform.OS === "web"
        ? 640
        : Math.max(360, Math.round(windowHeight * 0.58)),
    [windowHeight],
  );
  const [html, setHtml] = useState("");
  const [subject, setSubject] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const requestIdRef = useRef(0);

  useEffect(() => {
    if (!active) return;
    if (!sections.length) {
      setHtml("");
      setSubject("");
      setError(null);
      return;
    }

    const requestId = ++requestIdRef.current;
    const timer = setTimeout(() => {
      setLoading(true);
      setError(null);
      void (previewKind === "doctor-welcome"
        ? fetchAdminDoctorWelcomePreview(accessToken, {
            sections,
            language,
            themeColor,
            previewName,
            previewEmail,
            previewPassword,
          })
        : previewKind === "invited-doctor"
          ? fetchAdminInvitedDoctorPreview(accessToken, {
              sections,
              language,
              themeColor,
              name: previewName,
              email: previewEmail ?? "",
              password: previewPassword ?? "",
            })
          : fetchAdminMarketingPreview(accessToken, {
              sections,
              language,
              themeColor,
              previewName,
            }))
        .then((result) => {
          if (requestId !== requestIdRef.current) return;
          setHtml(result.html);
          setSubject(result.subject);
        })
        .catch((err) => {
          if (requestId !== requestIdRef.current) return;
          setError(err instanceof Error ? err.message : "Preview failed");
          setHtml("");
        })
        .finally(() => {
          if (requestId !== requestIdRef.current) return;
          setLoading(false);
        });
    }, 350);

    return () => clearTimeout(timer);
  }, [
    accessToken,
    active,
    language,
    previewEmail,
    previewKind,
    previewName,
    previewPassword,
    sections,
    themeColor,
  ]);

  if (!sections.length) {
    return (
      <Text style={[styles.empty, { color: colors.mutedForeground }]}>
        Add at least one section to preview the email.
      </Text>
    );
  }

  return (
    <View style={styles.wrap}>
      {subject ? (
        <View
          style={[
            styles.subjectBar,
            { backgroundColor: colors.muted, borderColor: colors.border },
          ]}
        >
          <Text style={[styles.subjectLabel, { color: colors.mutedForeground }]}>
            Subject
          </Text>
          <Text style={[styles.subjectText, { color: colors.foreground }]}>{subject}</Text>
        </View>
      ) : null}

      {loading ? (
        <ActivityIndicator color={colors.primary} style={styles.loader} />
      ) : null}

      {error ? (
        <Text style={[styles.error, { color: colors.destructive }]}>{error}</Text>
      ) : null}

      {!loading && html ? (
        <View
          style={[
            styles.frameWrap,
            {
              borderColor: colors.border,
              backgroundColor: "#f5f7fa",
              height: previewFrameHeight,
            },
          ]}
        >
          {Platform.OS === "web" ? (
            React.createElement("iframe", {
              srcDoc: html,
              title: "Marketing email preview",
              style: {
                width: "100%",
                height: "100%",
                border: "none",
                display: "block",
                background: "#f5f7fa",
              },
              sandbox: "allow-same-origin",
            })
          ) : (
            <WebView
              originWhitelist={["*"]}
              source={{ html: prepareEmailPreviewHtml(html) }}
              style={[styles.webView, { height: previewFrameHeight }]}
              scrollEnabled
              nestedScrollEnabled
              showsVerticalScrollIndicator
              overScrollMode="always"
              bounces
              javaScriptEnabled
              domStorageEnabled
              setSupportMultipleWindows={false}
            />
          )}
        </View>
      ) : null}

      <Text style={[styles.hint, { color: colors.mutedForeground }]}>
        Preview uses the first recipient name for {"{{name}}"} placeholders. Logo and
        screenshots load from CDN (same as sent emails).
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { gap: 10, marginTop: 4 },
  subjectBar: {
    borderWidth: 1,
    borderRadius: 10,
    paddingHorizontal: 14,
    paddingVertical: 10,
    gap: 4,
  },
  subjectLabel: { fontSize: 11, fontWeight: "700", textTransform: "uppercase" },
  subjectText: { fontSize: 14, fontWeight: "600", lineHeight: 20 },
  loader: { marginVertical: 24 },
  error: { fontSize: 13, lineHeight: 18 },
  frameWrap: {
    borderWidth: 1,
    borderRadius: 12,
    overflow: "hidden",
    minHeight: 320,
  },
  webView: {
    width: "100%",
    backgroundColor: "#f5f7fa",
  },
  empty: { fontSize: 13, lineHeight: 18, marginVertical: 12 },
  hint: { fontSize: 11, lineHeight: 16 },
});
