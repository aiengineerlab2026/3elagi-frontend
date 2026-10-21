import React, { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  ActivityIndicator,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
  useWindowDimensions,
} from "react-native";
import { AppTextInput } from "@/components/AppTextInput";
import { AdminShell } from "@/components/admin/AdminShell";
import { adminPagePadding } from "@/constants/adminLayout";
import { MarketingSectionBuilder } from "@/components/admin/MarketingSectionBuilder";
import { MarketingEmailPreview } from "@/components/admin/MarketingEmailPreview";
import {
  fetchAdminMarketingTemplate,
  sendAdminMarketingEmailBatch,
  type MarketingEmailLanguage,
  type MarketingEmailTheme,
} from "@/domains/admin/api";
import type { MarketingEmailSection } from "@/domains/admin/marketingSections";
import { parseMarketingRecipients } from "@/domains/admin/parseMarketingRecipients";
import {
  DEFAULT_MARKETING_EMAIL_THEME,
  MARKETING_EMAIL_THEMES,
  MARKETING_THEME_LABELS,
  MARKETING_THEME_PALETTES,
} from "@/domains/admin/marketingThemes";
import { useAuthStore } from "@/domains/auth/store";
import { useColors } from "@/hooks/useColors";
import { confirmAction } from "@/utils/confirmAction";
import { showErrorToast, showSuccessToast } from "@/utils/toast";

const LANGUAGES: { code: MarketingEmailLanguage; label: string; hint: string }[] = [
  { code: "en", label: "English", hint: "Left-to-right" },
  { code: "ar", label: "Arabic", hint: "Right-to-left" },
  { code: "es", label: "Spanish", hint: "Left-to-right" },
  { code: "de", label: "German", hint: "Left-to-right" },
];

const RECIPIENTS_PLACEHOLDER = `Dr. Ahmed Hassan, ahmed@example.com
Dr. Sara Ali, sara@example.com
Dr. Omar Khan <omar@example.com>`;

type BuilderTab = "edit" | "preview";

function sectionsHaveContent(sections: MarketingEmailSection[]): boolean {
  return sections.some((section) => {
    if (section.html?.trim()) return true;
    if (section.title?.trim()) return true;
    if (section.items?.some((item) => item.trim())) return true;
    if (section.buttonLabel?.trim() || section.buttonUrl?.trim()) return true;
    if (section.type === "screenshots") return true;
    return false;
  });
}

export default function AdminMarketingWeb() {
  const colors = useColors();
  const { width } = useWindowDimensions();
  const pagePadding = adminPagePadding(width <= 767);
  const accessToken = useAuthStore((s) => s.accessToken);
  const [recipientsText, setRecipientsText] = useState("");
  const [language, setLanguage] = useState<MarketingEmailLanguage>("en");
  const [themeColor, setThemeColor] = useState<MarketingEmailTheme>(
    DEFAULT_MARKETING_EMAIL_THEME,
  );
  const [sections, setSections] = useState<MarketingEmailSection[]>([]);
  const [bodyDir, setBodyDir] = useState<"ltr" | "rtl">("ltr");
  const [subjectPreview, setSubjectPreview] = useState("");
  const [loadingTemplate, setLoadingTemplate] = useState(true);
  const [sending, setSending] = useState(false);
  const [builderTab, setBuilderTab] = useState<BuilderTab>("edit");
  const sectionsDirtyRef = useRef(false);

  const parsedRecipients = useMemo(
    () => parseMarketingRecipients(recipientsText),
    [recipientsText],
  );
  const previewName = parsedRecipients[0]?.name ?? "Doctor";

  const loadTemplate = useCallback(
    async (
      lang: MarketingEmailLanguage,
      theme: MarketingEmailTheme,
      force = false,
    ) => {
      if (!accessToken) return;
      if (sectionsDirtyRef.current && !force) {
        const ok = await confirmAction(
          "Replace your current email sections with the default template for this language and theme?",
        );
        if (!ok) return;
      }

      setLoadingTemplate(true);
      try {
        const template = await fetchAdminMarketingTemplate(accessToken, lang, theme);
        setSections(template.sections);
        setBodyDir(template.dir);
        setSubjectPreview(template.subjectTemplate);
        setThemeColor(template.themeColor ?? theme);
        sectionsDirtyRef.current = false;
      } catch (e) {
        showErrorToast(e instanceof Error ? e.message : "Failed to load template");
      } finally {
        setLoadingTemplate(false);
      }
    },
    [accessToken],
  );

  useEffect(() => {
    void loadTemplate(language, themeColor, true);
  }, [accessToken]);

  const pickLanguage = (code: MarketingEmailLanguage) => {
    if (code === language) return;
    setLanguage(code);
    void loadTemplate(code, themeColor);
  };

  const pickTheme = (theme: MarketingEmailTheme) => {
    if (theme === themeColor) return;
    if (sectionsDirtyRef.current) {
      setThemeColor(theme);
      return;
    }
    setThemeColor(theme);
    void loadTemplate(language, theme);
  };

  const resetTemplate = async () => {
    const ok = await confirmAction(
      "Reset email sections to the default template for this language?",
    );
    if (!ok) return;
    void loadTemplate(language, themeColor, true);
  };

  const send = async () => {
    if (!accessToken || sending) return;
    const recipients = parseMarketingRecipients(recipientsText);

    if (!recipients.length) {
      showErrorToast(
        "Add at least one recipient (one per line: Name, email or Name <email>)",
      );
      return;
    }
    if (!sections.length || !sectionsHaveContent(sections)) {
      showErrorToast("Add at least one section with content");
      return;
    }

    const langLabel = LANGUAGES.find((l) => l.code === language)?.label ?? language;
    const recipientSummary =
      recipients.length === 1
        ? recipients[0].email
        : `${recipients.length} recipients`;
    const confirmed = await confirmAction(
      `Send the doctor invitation email to ${recipientSummary} in ${langLabel}?`,
    );
    if (!confirmed) return;

    setSending(true);
    try {
      const result = await sendAdminMarketingEmailBatch(accessToken, {
        recipients,
        language,
        sections,
        themeColor,
      });

      if (result.failed === 0) {
        showSuccessToast(
          result.sent === 1
            ? `Email sent to ${result.results[0]?.email}`
            : `Sent ${result.sent} emails`,
        );
        setRecipientsText("");
      } else if (result.sent > 0) {
        const failedEmails = result.results
          .filter((row) => !row.ok)
          .map((row) => row.email)
          .join(", ");
        showErrorToast(
          `Sent ${result.sent} of ${result.total}. Failed: ${failedEmails}`,
        );
      } else {
        showErrorToast(
          result.results[0]?.error ?? "Failed to send all emails",
        );
      }
    } catch (e) {
      showErrorToast(e instanceof Error ? e.message : "Failed to send emails");
    } finally {
      setSending(false);
    }
  };

  return (
    <AdminShell
      title="Marketing"
      subtitle="Compose and send the doctor invitation email. Add or reorder sections, paste multiple recipients, then send once."
    >
      <ScrollView
        nestedScrollEnabled={builderTab === "preview"}
        contentContainerStyle={[styles.scroll, { padding: pagePadding }]}
      >
        <View
          style={[
            styles.card,
            { backgroundColor: colors.card, borderColor: colors.border },
          ]}
        >
          <Text style={[styles.sectionTitle, { color: colors.foreground }]}>
            Recipients
          </Text>

          <Text style={[styles.label, { color: colors.mutedForeground }]}>
            One per line — Name, email · Name &lt;email&gt; · or email only
          </Text>
          <AppTextInput
            value={recipientsText}
            onChangeText={setRecipientsText}
            placeholder={RECIPIENTS_PLACEHOLDER}
            multiline
            numberOfLines={6}
            textAlignVertical="top"
            autoCapitalize="none"
            autoCorrect={false}
            style={[
              styles.recipientsInput,
              {
                backgroundColor: colors.background,
                borderColor: colors.border,
                color: colors.foreground,
              },
            ]}
          />
          <Text style={[styles.recipientCount, { color: colors.mutedForeground }]}>
            {parsedRecipients.length === 0
              ? "No valid recipients parsed yet"
              : parsedRecipients.length === 1
                ? `1 recipient: ${parsedRecipients[0].email}`
                : `${parsedRecipients.length} recipients ready to send`}
          </Text>

          <Text style={[styles.label, { color: colors.mutedForeground }]}>
            Email language
          </Text>
          <View style={styles.langRow}>
            {LANGUAGES.map((item) => {
              const active = language === item.code;
              return (
                <Pressable
                  key={item.code}
                  onPress={() => pickLanguage(item.code)}
                  style={({ pressed }) => [
                    styles.langChip,
                    {
                      borderColor: active ? colors.primary : colors.border,
                      backgroundColor: active
                        ? `${colors.primary}14`
                        : pressed
                          ? colors.muted
                          : colors.background,
                    },
                  ]}
                >
                  <Text
                    style={[
                      styles.langLabel,
                      {
                        color: active ? colors.primary : colors.foreground,
                        fontWeight: active ? "800" : "600",
                      },
                    ]}
                  >
                    {item.label}
                  </Text>
                  <Text style={[styles.langHint, { color: colors.mutedForeground }]}>
                    {item.hint}
                  </Text>
                </Pressable>
              );
            })}
          </View>

          <Text style={[styles.label, { color: colors.mutedForeground }]}>
            Theme color
          </Text>
          <View style={styles.langRow}>
            {MARKETING_EMAIL_THEMES.map((theme) => {
              const active = themeColor === theme;
              const palette = MARKETING_THEME_PALETTES[theme];
              return (
                <Pressable
                  key={theme}
                  onPress={() => pickTheme(theme)}
                  style={({ pressed }) => [
                    styles.themeChip,
                    {
                      borderColor: active ? palette.brand : colors.border,
                      backgroundColor: active
                        ? `${palette.brand}14`
                        : pressed
                          ? colors.muted
                          : colors.background,
                    },
                  ]}
                >
                  <View
                    style={[
                      styles.themeSwatch,
                      {
                        backgroundColor: palette.brand,
                      },
                    ]}
                  />
                  <Text
                    style={[
                      styles.langLabel,
                      {
                        color: active ? palette.brand : colors.foreground,
                        fontWeight: active ? "800" : "600",
                      },
                    ]}
                  >
                    {MARKETING_THEME_LABELS[theme]}
                  </Text>
                </Pressable>
              );
            })}
          </View>

          <View style={styles.bodyHeader}>
            <Text style={[styles.sectionTitle, { color: colors.foreground }]}>
              Email sections
            </Text>
            <Pressable
              onPress={() => void resetTemplate()}
              style={({ pressed }) => [
                styles.resetBtn,
                {
                  borderColor: colors.border,
                  backgroundColor: pressed ? colors.muted : colors.background,
                },
              ]}
            >
              <Text style={[styles.resetBtnText, { color: colors.foreground }]}>
                Reset template
              </Text>
            </Pressable>
          </View>

          {subjectPreview && builderTab === "edit" ? (
            <Text style={[styles.subjectPreview, { color: colors.mutedForeground }]}>
              Subject preview: {subjectPreview.replace("{{name}}", previewName)}
            </Text>
          ) : null}

          <View style={styles.tabRow}>
            {(
              [
                { id: "edit" as const, label: "Edit sections" },
                { id: "preview" as const, label: "Preview" },
              ] as const
            ).map((tab) => {
              const active = builderTab === tab.id;
              return (
                <Pressable
                  key={tab.id}
                  onPress={() => setBuilderTab(tab.id)}
                  style={({ pressed }) => [
                    styles.tabBtn,
                    {
                      borderColor: active ? colors.primary : colors.border,
                      backgroundColor: active
                        ? `${colors.primary}14`
                        : pressed
                          ? colors.muted
                          : colors.background,
                    },
                  ]}
                >
                  <Text
                    style={{
                      color: active ? colors.primary : colors.foreground,
                      fontWeight: active ? "800" : "600",
                      fontSize: 13,
                    }}
                  >
                    {tab.label}
                  </Text>
                </Pressable>
              );
            })}
          </View>

          {loadingTemplate ? (
            <ActivityIndicator color={colors.primary} style={{ marginVertical: 24 }} />
          ) : builderTab === "edit" ? (
            <MarketingSectionBuilder
              sections={sections}
              onChange={(next) => {
                sectionsDirtyRef.current = true;
                setSections(next);
              }}
              dir={bodyDir}
            />
          ) : accessToken ? (
            <MarketingEmailPreview
              accessToken={accessToken}
              sections={sections}
              language={language}
              themeColor={themeColor}
              previewName={previewName}
              active={builderTab === "preview"}
            />
          ) : null}

          <Pressable
            onPress={() => void send()}
            disabled={sending || loadingTemplate}
            style={({ pressed }) => [
              styles.sendBtn,
              {
                backgroundColor: sending
                  ? `${colors.primary}99`
                  : pressed
                    ? `${colors.primary}e6`
                    : colors.primary,
                opacity: sending || loadingTemplate ? 0.85 : 1,
              },
            ]}
          >
            {sending ? (
              <ActivityIndicator color={colors.primaryForeground} />
            ) : (
              <Text style={[styles.sendBtnText, { color: colors.primaryForeground }]}>
                {parsedRecipients.length <= 1
                  ? "Send invitation email"
                  : `Send to ${parsedRecipients.length} recipients`}
              </Text>
            )}
          </Pressable>
        </View>
      </ScrollView>
    </AdminShell>
  );
}

const styles = StyleSheet.create({
  scroll: {
    paddingBottom: 48,
    maxWidth: 960,
    width: "100%",
    alignSelf: "center",
  },
  card: {
    borderWidth: 1,
    borderRadius: 16,
    padding: 22,
    gap: 8,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: "800",
    marginBottom: 4,
  },
  label: {
    fontSize: 13,
    fontWeight: "700",
    marginTop: 8,
  },
  recipientsInput: {
    borderWidth: 1,
    borderRadius: 12,
    paddingHorizontal: 14,
    paddingVertical: 12,
    fontSize: 14,
    lineHeight: 20,
    minHeight: 140,
    fontFamily: Platform.OS === "web" ? "ui-monospace, monospace" : undefined,
  },
  recipientCount: {
    fontSize: 12,
    marginTop: 4,
    marginBottom: 4,
  },
  langRow: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 10,
    marginTop: 4,
    marginBottom: 8,
  },
  langChip: {
    borderWidth: 1.5,
    borderRadius: 12,
    paddingHorizontal: 14,
    paddingVertical: 10,
    minWidth: 120,
    cursor: "pointer" as "auto",
  },
  themeChip: {
    borderWidth: 1.5,
    borderRadius: 12,
    paddingHorizontal: 14,
    paddingVertical: 10,
    minWidth: 100,
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    cursor: "pointer" as "auto",
  },
  themeSwatch: {
    width: 18,
    height: 18,
    borderRadius: 999,
  },
  langLabel: {
    fontSize: 14,
  },
  langHint: {
    fontSize: 11,
    marginTop: 2,
  },
  bodyHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginTop: 16,
    gap: 12,
  },
  resetBtn: {
    borderWidth: 1,
    borderRadius: 10,
    paddingHorizontal: 12,
    paddingVertical: 8,
    cursor: "pointer" as "auto",
  },
  resetBtnText: {
    fontSize: 12,
    fontWeight: "700",
  },
  subjectPreview: {
    fontSize: 12,
    lineHeight: 18,
    marginBottom: 4,
  },
  tabRow: {
    flexDirection: "row",
    gap: 8,
    marginTop: 8,
    marginBottom: 4,
  },
  tabBtn: {
    borderWidth: 1.5,
    borderRadius: 10,
    paddingHorizontal: 14,
    paddingVertical: 8,
    cursor: "pointer" as "auto",
  },
  sendBtn: {
    marginTop: 16,
    borderRadius: 12,
    paddingVertical: 14,
    alignItems: "center",
    justifyContent: "center",
    cursor: "pointer" as "auto",
  },
  sendBtnText: {
    fontSize: 15,
    fontWeight: "800",
  },
});
