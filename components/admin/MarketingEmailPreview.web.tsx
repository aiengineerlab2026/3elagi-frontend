import React, { useEffect, useRef, useState } from "react";
import { ActivityIndicator, Platform, StyleSheet, Text, View } from "react-native";
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
  const [html, setHtml] = useState("");
  const [subject, setSubject] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const requestIdRef = useRef(0);

  useEffect(() => {
    if (!active || Platform.OS !== "web") return;
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

  if (Platform.OS !== "web") return null;

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
            { borderColor: colors.border, backgroundColor: "#f5f7fa" },
          ]}
        >
          {React.createElement("iframe", {
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
          })}
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
    height: 640,
    minHeight: 400,
  },
  empty: { fontSize: 13, lineHeight: 18, marginVertical: 12 },
  hint: { fontSize: 11, lineHeight: 16 },
});
