import React, { useCallback, useEffect, useRef, useState } from "react";
import {
  ActivityIndicator,
  Pressable,
  StyleSheet,
  Text,
  View,
} from "react-native";
import { MarketingSectionBuilder } from "@/components/admin/MarketingSectionBuilder.web";
import { MarketingEmailPreview } from "@/components/admin/MarketingEmailPreview.web";
import {
  fetchAdminDoctorWelcomeTemplate,
  type MarketingEmailLanguage,
  type MarketingEmailTheme,
} from "@/domains/admin/api";
import type { MarketingEmailSection } from "@/domains/admin/marketingSections";
import {
  DEFAULT_MARKETING_EMAIL_THEME,
  MARKETING_EMAIL_THEMES,
  MARKETING_THEME_LABELS,
} from "@/domains/admin/marketingThemes";
import { useAuthStore } from "@/domains/auth/store";
import { useColors } from "@/hooks/useColors";

const LANGUAGES: { code: MarketingEmailLanguage; label: string }[] = [
  { code: "en", label: "English" },
  { code: "ar", label: "Arabic" },
  { code: "es", label: "Spanish" },
  { code: "de", label: "German" },
];

type BuilderTab = "edit" | "preview";

export interface DoctorWelcomeEmailState {
  enabled: boolean;
  language: MarketingEmailLanguage;
  themeColor: MarketingEmailTheme;
  sections: MarketingEmailSection[];
}

interface Props {
  previewName?: string;
  previewEmail?: string;
  previewPassword?: string;
  value: DoctorWelcomeEmailState;
  onChange: (next: DoctorWelcomeEmailState) => void;
}

export function DoctorWelcomeEmailPanel({
  previewName = "Doctor",
  previewEmail = "doctor@example.com",
  previewPassword = "YourPassword123",
  value,
  onChange,
}: Props) {
  const colors = useColors();
  const accessToken = useAuthStore((s) => s.accessToken);
  const [loadingTemplate, setLoadingTemplate] = useState(true);
  const [builderTab, setBuilderTab] = useState<BuilderTab>("edit");
  const sectionsDirtyRef = useRef(false);
  const valueRef = useRef(value);
  valueRef.current = value;

  const loadTemplate = useCallback(
    async (
      lang: MarketingEmailLanguage,
      theme: MarketingEmailTheme,
      force = false,
    ) => {
      if (!accessToken) return;
      if (sectionsDirtyRef.current && !force) {
        const ok =
          typeof window !== "undefined" &&
          window.confirm(
            "Replace your welcome email sections with the default template for this language?",
          );
        if (!ok) return;
      }

      setLoadingTemplate(true);
      try {
        const template = await fetchAdminDoctorWelcomeTemplate(
          accessToken,
          lang,
          theme,
        );
        onChange({
          ...valueRef.current,
          language: lang,
          themeColor: template.themeColor ?? theme,
          sections: template.sections,
        });
        sectionsDirtyRef.current = false;
      } finally {
        setLoadingTemplate(false);
      }
    },
    [accessToken, onChange],
  );

  useEffect(() => {
    if (!accessToken || value.sections.length) {
      setLoadingTemplate(false);
      return;
    }
    void loadTemplate(value.language, value.themeColor, true);
  }, [accessToken, loadTemplate, value.language, value.sections.length, value.themeColor]);

  const patch = (partial: Partial<DoctorWelcomeEmailState>) => {
    onChange({ ...value, ...partial });
  };

  return (
    <View style={[styles.wrap, { borderColor: colors.border, backgroundColor: colors.card }]}>
      <Pressable
        onPress={() => patch({ enabled: !value.enabled })}
        style={[styles.toggleRow, { flexDirection: "row" }]}
      >
        <View
          style={[
            styles.checkbox,
            {
              borderColor: colors.border,
              backgroundColor: value.enabled ? colors.primary : "transparent",
            },
          ]}
        />
        <View style={{ flex: 1 }}>
          <Text style={[styles.toggleTitle, { color: colors.foreground }]}>
            Send welcome email with login credentials
          </Text>
          <Text style={[styles.toggleHint, { color: colors.mutedForeground }]}>
            Same builder as marketing mail. Placeholders: {"{{name}}"}, {"{{email}}"}, {"{{password}}"}, {"{{login_url}}"}.
          </Text>
        </View>
      </Pressable>

      {value.enabled ? (
        <>
          <View style={styles.langRow}>
            {LANGUAGES.map((lang) => (
              <Pressable
                key={lang.code}
                onPress={() => {
                  patch({ language: lang.code });
                  void loadTemplate(lang.code, value.themeColor);
                }}
                style={[
                  styles.chip,
                  {
                    borderColor: colors.border,
                    backgroundColor:
                      value.language === lang.code ? colors.muted : colors.background,
                  },
                ]}
              >
                <Text style={{ color: colors.foreground, fontSize: 13 }}>{lang.label}</Text>
              </Pressable>
            ))}
          </View>

          <View style={styles.langRow}>
            {MARKETING_EMAIL_THEMES.map((theme) => (
              <Pressable
                key={theme}
                onPress={() => patch({ themeColor: theme })}
                style={[
                  styles.chip,
                  {
                    borderColor: colors.border,
                    backgroundColor:
                      value.themeColor === theme ? colors.muted : colors.background,
                  },
                ]}
              >
                <Text style={{ color: colors.foreground, fontSize: 13 }}>
                  {MARKETING_THEME_LABELS[theme]}
                </Text>
              </Pressable>
            ))}
          </View>

          <View style={styles.tabRow}>
            {(["edit", "preview"] as BuilderTab[]).map((tab) => (
              <Pressable
                key={tab}
                onPress={() => setBuilderTab(tab)}
                style={[
                  styles.tab,
                  builderTab === tab && { borderBottomColor: colors.primary, borderBottomWidth: 2 },
                ]}
              >
                <Text style={{ color: colors.foreground, fontWeight: builderTab === tab ? "700" : "400" }}>
                  {tab === "edit" ? "Edit sections" : "Preview"}
                </Text>
              </Pressable>
            ))}
            <Pressable
              onPress={() => void loadTemplate(value.language, value.themeColor, true)}
              style={styles.resetBtn}
            >
              <Text style={{ color: colors.primary, fontSize: 13 }}>Reset template</Text>
            </Pressable>
          </View>

          {loadingTemplate ? (
            <ActivityIndicator color={colors.primary} style={{ marginVertical: 24 }} />
          ) : builderTab === "edit" ? (
            <MarketingSectionBuilder
              sections={value.sections}
              onChange={(sections) => {
                sectionsDirtyRef.current = true;
                patch({ sections });
              }}
            />
          ) : accessToken ? (
            <MarketingEmailPreview
              accessToken={accessToken}
              sections={value.sections}
              language={value.language}
              themeColor={value.themeColor}
              previewName={previewName}
              previewKind="doctor-welcome"
              previewEmail={previewEmail}
              previewPassword={previewPassword}
              active
            />
          ) : null}
        </>
      ) : null}
    </View>
  );
}

export function defaultDoctorWelcomeEmailState(): DoctorWelcomeEmailState {
  return {
    enabled: true,
    language: "en",
    themeColor: DEFAULT_MARKETING_EMAIL_THEME,
    sections: [],
  };
}

const styles = StyleSheet.create({
  wrap: {
    marginTop: 28,
    padding: 20,
    borderRadius: 12,
    borderWidth: 1,
    gap: 16,
  },
  toggleRow: {
    alignItems: "flex-start",
    gap: 12,
  },
  checkbox: {
    width: 22,
    height: 22,
    borderRadius: 6,
    borderWidth: 2,
    marginTop: 2,
  },
  toggleTitle: {
    fontSize: 16,
    fontWeight: "700",
    marginBottom: 4,
  },
  toggleHint: {
    fontSize: 13,
    lineHeight: 18,
  },
  langRow: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 8,
  },
  chip: {
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 999,
    borderWidth: 1,
  },
  tabRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 16,
    borderBottomWidth: 1,
    borderBottomColor: "#e2e8f0",
    paddingBottom: 8,
  },
  tab: {
    paddingVertical: 6,
    paddingHorizontal: 4,
  },
  resetBtn: {
    marginLeft: "auto",
  },
});
