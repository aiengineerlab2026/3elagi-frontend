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
import { AdminDoctorMultiSelect } from "@/components/admin/AdminDoctorMultiSelect";
import { AdminShell } from "@/components/admin/AdminShell";
import { adminPagePadding } from "@/constants/adminLayout";
import { MarketingSectionBuilder } from "@/components/admin/MarketingSectionBuilder";
import { MarketingEmailPreview } from "@/components/admin/MarketingEmailPreview";
import {
  fetchAdminDoctorWelcomeTemplate,
  fetchAdminDoctors,
  sendAdminDoctorWelcomeEmailBatch,
  type AdminDoctorRow,
  type MarketingEmailLanguage,
  type MarketingEmailTheme,
} from "@/domains/admin/api";
import { DEFAULT_DOCTOR_WELCOME_PASSWORD } from "@/domains/admin/constants";
import { parseCommaEmails } from "@/domains/admin/parseCommaList";
import type { MarketingEmailSection } from "@/domains/admin/marketingSections";
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

function doctorPassword(doctor: AdminDoctorRow): string {
  return doctor.welcome_password?.trim() || DEFAULT_DOCTOR_WELCOME_PASSWORD;
}

const LANGUAGES: { code: MarketingEmailLanguage; label: string; hint: string }[] = [
  { code: "en", label: "English", hint: "Left-to-right" },
  { code: "ar", label: "Arabic", hint: "Right-to-left" },
  { code: "es", label: "Spanish", hint: "Left-to-right" },
  { code: "de", label: "German", hint: "Left-to-right" },
];

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

export default function AdminDoctorWelcomeEmailWeb() {
  const colors = useColors();
  const { width } = useWindowDimensions();
  const pagePadding = adminPagePadding(width <= 767);
  const accessToken = useAuthStore((s) => s.accessToken);
  const [doctors, setDoctors] = useState<AdminDoctorRow[]>([]);
  const [loadingDoctors, setLoadingDoctors] = useState(true);
  const [selectedDoctorIds, setSelectedDoctorIds] = useState<string[]>([]);
  const [emailsText, setEmailsText] = useState("");
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

  const selectedDoctors = useMemo(
    () => doctors.filter((doctor) => selectedDoctorIds.includes(doctor.id)),
    [doctors, selectedDoctorIds],
  );
  const previewDoctor = selectedDoctors[0];
  const previewName = previewDoctor?.name?.trim() || "Doctor";
  const previewPassword = previewDoctor ? doctorPassword(previewDoctor) : "";

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
        const template = await fetchAdminDoctorWelcomeTemplate(accessToken, lang, theme);
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

  useEffect(() => {
    if (!accessToken) return;
    setLoadingDoctors(true);
    fetchAdminDoctors(accessToken)
      .then((rows) => setDoctors(rows))
      .catch((e) =>
        showErrorToast(e instanceof Error ? e.message : "Failed to load doctors"),
      )
      .finally(() => setLoadingDoctors(false));
  }, [accessToken]);

  const extraEmails = parseCommaEmails(emailsText);
  const primaryEmail =
    previewDoctor?.email?.trim() || extraEmails[0] || "";

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

    if (!selectedDoctors.length) {
      showErrorToast("Select at least one doctor");
      return;
    }
    if (!sections.length || !sectionsHaveContent(sections)) {
      showErrorToast("Add at least one section with content");
      return;
    }

    const sendPlans = selectedDoctors
      .map((doctor) => {
        const accountEmail = doctor.email?.trim().toLowerCase() ?? "";
        const emails = [
          ...(accountEmail ? [accountEmail] : []),
          ...extraEmails.filter((email) => email !== accountEmail),
        ];
        return {
          doctor,
          emails,
        };
      })
      .filter((plan) => plan.emails.length > 0);

    const missingEmailDoctors = selectedDoctors.filter(
      (doctor) => !doctor.email?.trim() && !extraEmails.length,
    );
    if (missingEmailDoctors.length) {
      showErrorToast(
        "Missing email",
        `${missingEmailDoctors.map((d) => d.name).join(", ")} — add an account email or extra recipients.`,
      );
      return;
    }
    if (!sendPlans.length) {
      showErrorToast("Enter at least one valid recipient email");
      return;
    }

    const totalRecipients = sendPlans.reduce((sum, plan) => sum + plan.emails.length, 0);
    const langLabel = LANGUAGES.find((l) => l.code === language)?.label ?? language;
    const confirmed = await confirmAction(
      `Send welcome emails for ${sendPlans.length} doctor(s) to ${totalRecipients} address(es) in ${langLabel}?`,
    );
    if (!confirmed) return;

    setSending(true);
    try {
      let sentTotal = 0;
      let failedTotal = 0;
      const failures: string[] = [];

      for (const plan of sendPlans) {
        const result = await sendAdminDoctorWelcomeEmailBatch(accessToken, {
          name: plan.doctor.name,
          emails: plan.emails,
          password: doctorPassword(plan.doctor),
          language,
          sections,
          themeColor,
        });
        sentTotal += result.sent;
        failedTotal += result.failed;
        failures.push(
          ...result.results
            .filter((row) => !row.ok)
            .map((row) => `${plan.doctor.name} → ${row.email}: ${row.error ?? "failed"}`),
        );
      }

      if (failedTotal === 0) {
        showSuccessToast(
          `Welcome email sent for ${sendPlans.length} doctor(s) (${sentTotal} address(es))`,
        );
      } else {
        showErrorToast(
          `Sent ${sentTotal}, failed ${failedTotal}`,
          failures.join("; "),
        );
      }
    } catch (e) {
      showErrorToast(e instanceof Error ? e.message : "Failed to send email");
    } finally {
      setSending(false);
    }
  };

  const inputStyle = [
    styles.fieldInput,
    {
      backgroundColor: colors.background,
      borderColor: colors.border,
      color: colors.foreground,
    },
  ];

  return (
    <AdminShell
      title="Welcome email"
      subtitle="Send a welcome email with login credentials to a doctor whose account you already created. Enter their email and password, customize the template, then send."
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
            Login credentials
          </Text>
          <Text style={[styles.label, { color: colors.mutedForeground }]}>
            Search and select doctors from the dropdown. Each receives their own name and
            password. Optional extra emails are added for every selected doctor.
          </Text>

          <AdminDoctorMultiSelect
            doctors={doctors}
            selectedIds={selectedDoctorIds}
            onChange={setSelectedDoctorIds}
            loading={loadingDoctors}
            label={`Doctors (${selectedDoctors.length} selected)`}
          />

          {selectedDoctors.length ? (
            <View
              style={[
                styles.selectedSummary,
                { borderColor: colors.border, backgroundColor: `${colors.primary}08` },
              ]}
            >
              {selectedDoctors.map((doctor) => (
                <Text
                  key={doctor.id}
                  style={[styles.selectedSummaryRow, { color: colors.foreground }]}
                >
                  {doctor.name} — {doctor.email?.trim() || "no email"} — {doctorPassword(doctor)}
                </Text>
              ))}
            </View>
          ) : null}

          <Text style={[styles.fieldLabel, { color: colors.foreground }]}>
            Extra email(s) for all selected (optional)
          </Text>
          <AppTextInput
            value={emailsText}
            onChangeText={setEmailsText}
            placeholder="assistant@clinic.com, admin@clinic.com"
            autoCapitalize="none"
            autoCorrect={false}
            keyboardType="email-address"
            multiline
            style={[...inputStyle, styles.emailsInput]}
          />
          {extraEmails.length ? (
            <Text style={[styles.label, { color: colors.mutedForeground }]}>
              {extraEmails.length} extra address(es) will be added for each selected doctor
            </Text>
          ) : null}

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
                      { backgroundColor: palette.brand },
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
              previewEmail={primaryEmail}
              previewPassword={previewPassword}
              previewKind="doctor-welcome"
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
                Send welcome email
                {selectedDoctors.length > 1 ? ` (${selectedDoctors.length} doctors)` : ""}
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
  fieldLabel: {
    fontSize: 13,
    fontWeight: "700",
    marginTop: 10,
    marginBottom: 4,
  },
  fieldInput: {
    borderWidth: 1,
    borderRadius: 12,
    paddingHorizontal: 14,
    paddingVertical: 12,
    fontSize: 14,
    lineHeight: 20,
    fontFamily: Platform.OS === "web" ? "inherit" : undefined,
  },
  readonlyInput: {
    opacity: 0.92,
  },
  emailsInput: {
    minHeight: 72,
    textAlignVertical: "top",
  },
  selectedSummary: {
    borderWidth: 1,
    borderRadius: 10,
    padding: 12,
    gap: 6,
  },
  selectedSummaryRow: {
    fontSize: 12,
    lineHeight: 18,
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
