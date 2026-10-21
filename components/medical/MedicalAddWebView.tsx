import {
  ArrowLeft,
  ArrowRight,
  FileText,
  Plus,
  Sparkles,
  Upload,
  X,
  ZoomIn,
} from "lucide-react-native";
import React, { useRef } from "react";
import {
  ActivityIndicator,
  Image,
  Modal,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
  type ViewStyle,
} from "react-native";
import { AppTextInput } from "@/components/AppTextInput";
import { useAiEnabled } from "@/domains/ai/aiPreference";
import { MEDICAL_FORM_SAVE_BAR_HEIGHT } from "@/constants/medicalFormFooter";
import type { MedicalCategory } from "@/domains/medical/types";
import { useColors } from "@/hooks/useColors";
import { BodyPartPicker } from "@/components/records/BodyPartPicker";
import { useMedicalAddForm } from "@/hooks/useMedicalAddForm";
import { useWebLayout } from "@/hooks/useWebLayout";

const CATEGORY_OPTIONS: { key: MedicalCategory; labelEn: string; labelAr: string }[] = [
  { key: "diagnosis", labelEn: "Diagnosis", labelAr: "تشخيص" },
  { key: "lab", labelEn: "Lab result", labelAr: "مختبر" },
  { key: "xray", labelEn: "X-ray / scan", labelAr: "أشعة" },
];

function gridStyle(columns: number): ViewStyle {
  if (columns <= 1) return { flexDirection: "column", gap: 16 };
  return {
    display: "grid",
    gridTemplateColumns: `repeat(${columns}, minmax(0, 1fr))`,
    gap: 16,
  } as unknown as ViewStyle;
}

function SectionCard({
  title,
  subtitle,
  children,
  colors,
  textAlign,
}: {
  title: string;
  subtitle?: string;
  children: React.ReactNode;
  colors: ReturnType<typeof useColors>;
  textAlign: "left" | "right";
}) {
  return (
    <View style={[styles.sectionCard, { backgroundColor: colors.card, borderColor: colors.border }]}>
      <View style={styles.sectionHeader}>
        <Text style={[styles.sectionTitle, { color: colors.foreground, textAlign }]}>{title}</Text>
        {subtitle ? (
          <Text style={[styles.sectionSubtitle, { color: colors.mutedForeground, textAlign }]}>
            {subtitle}
          </Text>
        ) : null}
      </View>
      {children}
    </View>
  );
}

function FormField({
  label,
  value,
  onChange,
  placeholder,
  multiline,
  required,
  colors,
  textAlign,
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
  placeholder?: string;
  multiline?: boolean;
  required?: boolean;
  colors: ReturnType<typeof useColors>;
  textAlign: "left" | "right";
}) {
  return (
    <View style={styles.field}>
      <Text style={[styles.fieldLabel, { color: colors.foreground, textAlign }]}>
        {label}
        {required ? <Text style={{ color: "#ef4444" }}> *</Text> : null}
      </Text>
      <AppTextInput
        value={value}
        onChangeText={onChange}
        placeholder={placeholder}
        placeholderTextColor={colors.mutedForeground}
        multiline={multiline}
        style={[
          styles.input,
          multiline && styles.inputMultiline,
          {
            backgroundColor: colors.background,
            borderColor: colors.border,
            color: colors.foreground,
            textAlign,
          },
        ]}
      />
    </View>
  );
}

export function MedicalAddWebView() {
  const colors = useColors();
  const aiEnabled = useAiEnabled();
  const { isDesktop, isTablet } = useWebLayout();
  const form = useMedicalAddForm();
  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const {
    isRTL,
    category,
    setCategory,
    hasCategoryParam,
    availableCategories,
    bodyPart,
    setBodyPart,
    title,
    setTitle,
    value,
    setValue,
    notes,
    setNotes,
    symptomLines,
    addSymptomLine,
    updateSymptomLine,
    removeSymptomLine,
    attached,
    setAttached,
    uploading,
    analyzingImage,
    zoomVisible,
    setZoomVisible,
    linkableDocs,
    loadingLinkable,
    selectedDocumentIds,
    toggleDocumentLink,
    isDiagnosis,
    isLabOrXray,
    isImage,
    generateAiInsight,
    completeWithAi,
    completingAi,
    submit,
    pageTitle,
    pageSubtitle,
    goBack,
  } = form;

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () => {
      setAttached({
        uri: reader.result as string,
        name: file.name,
        mimeType: file.type || "application/octet-stream",
        webFile: file,
      });
    };
    reader.readAsDataURL(file);
    e.target.value = "";
  };

  const dir = isRTL ? "row-reverse" : "row";
  const textAlign = isRTL ? "right" : "left";
  const twoCol = isDesktop || isTablet;

  const saveButton = (
    <Pressable
      testID="medical-add-save"
      accessibilityRole="button"
      onPress={() => void submit()}
      disabled={uploading || analyzingImage}
      style={[
        styles.saveBtn,
        Platform.OS === "web" && styles.saveBtnWeb,
        { backgroundColor: colors.primary, opacity: uploading || analyzingImage ? 0.7 : 1 },
      ]}
    >
      {uploading || analyzingImage ? (
        <ActivityIndicator size="small" color="#fff" />
      ) : (
        <Text style={styles.saveBtnText} pointerEvents="none">
          {isRTL ? "حفظ" : "Save"}
        </Text>
      )}
    </Pressable>
  );

  const renderSymptoms = () => (
    <SectionCard
      title={isRTL ? "الأعراض" : "Symptoms"}
      subtitle={isRTL ? "اختياري" : "Optional"}
      colors={colors}
      textAlign={textAlign}
    >
      <View style={styles.symptomList}>
        {symptomLines.map((line, index) => (
          <View key={line.id} style={[styles.symptomRow, { flexDirection: dir }]}>
            <AppTextInput
              value={line.text}
              onChangeText={(t) => updateSymptomLine(line.id, t)}
              placeholder={isRTL ? `عرض ${index + 1}` : `Symptom ${index + 1}`}
              placeholderTextColor={colors.mutedForeground}
              style={[
                styles.input,
                styles.symptomInput,
                {
                  backgroundColor: colors.background,
                  borderColor: colors.border,
                  color: colors.foreground,
                  textAlign,
                },
              ]}
            />
            <Pressable
              onPress={() => removeSymptomLine(line.id)}
              style={[styles.symptomRemove, { backgroundColor: colors.muted }]}
            >
              <X size={16} color={colors.mutedForeground} />
            </Pressable>
          </View>
        ))}
      </View>
      <Pressable
        onPress={addSymptomLine}
        style={[styles.addSymptomBtn, { borderColor: colors.border, flexDirection: dir }]}
      >
        <Plus size={16} color={colors.primary} />
        <Text style={{ color: colors.primary, fontWeight: "600" }}>
          {isRTL ? "إضافة عرض" : "Add symptom"}
        </Text>
      </Pressable>
    </SectionCard>
  );

  const renderLinkedDocs = () => (
    <SectionCard
      title={isRTL ? "نتائج مرتبطة" : "Linked results"}
      subtitle={isRTL ? "مختبر وأشعة غير مرتبطة" : "Unlinked lab & imaging"}
      colors={colors}
      textAlign={textAlign}
    >
      {loadingLinkable ? (
        <ActivityIndicator color={colors.primary} style={{ marginVertical: 8 }} />
      ) : linkableDocs.length === 0 ? (
        <Text style={{ color: colors.mutedForeground, fontSize: 14, textAlign }}>
          {isRTL
            ? "لا توجد نتائج مختبر أو أشعة متاحة."
            : "No lab results or X-rays available."}
        </Text>
      ) : (
        <View style={gridStyle(twoCol ? 2 : 1)}>
          {linkableDocs.map((doc) => {
            const selected = selectedDocumentIds.includes(doc.id);
            const catLabel =
              doc.category === "lab"
                ? isRTL
                  ? "مختبر"
                  : "Lab"
                : isRTL
                  ? "أشعة"
                  : "X-ray";
            return (
              <Pressable
                key={doc.id}
                onPress={() => toggleDocumentLink(doc.id)}
                style={[
                  styles.linkRow,
                  {
                    borderColor: selected ? colors.primary : colors.border,
                    backgroundColor: selected ? `${colors.primary}12` : colors.background,
                    flexDirection: dir,
                  },
                ]}
              >
                <View
                  style={[
                    styles.linkCheck,
                    {
                      borderColor: selected ? colors.primary : colors.border,
                      backgroundColor: selected ? colors.primary : "transparent",
                    },
                  ]}
                >
                  {selected ? (
                    <Text style={{ color: "#fff", fontSize: 12, fontWeight: "800" }}>✓</Text>
                  ) : null}
                </View>
                <View style={{ flex: 1, gap: 2 }}>
                  <Text
                    style={{ color: colors.foreground, fontWeight: "700", textAlign }}
                    numberOfLines={2}
                  >
                    {doc.title}
                  </Text>
                  <Text style={{ color: colors.mutedForeground, fontSize: 12, textAlign }}>
                    {catLabel}
                  </Text>
                  {doc.linkedDiagnoses && doc.linkedDiagnoses.length > 0 ? (
                    <Text style={{ color: colors.mutedForeground, fontSize: 11, textAlign }}>
                      {isRTL
                        ? `مرتبط بـ ${doc.linkedDiagnoses.length} تشخيص`
                        : `Linked to ${doc.linkedDiagnoses.length} diagnosis${doc.linkedDiagnoses.length === 1 ? "" : "es"}`}
                    </Text>
                  ) : null}
                </View>
              </Pressable>
            );
          })}
        </View>
      )}
    </SectionCard>
  );

  const renderAttachment = () => (
    <SectionCard
      title={isRTL ? "المرفق" : "Attachment"}
      subtitle={isRTL ? "صورة أو ملف PDF" : "Image or PDF file"}
      colors={colors}
      textAlign={textAlign}
    >
      {attached ? (
        <View style={[styles.previewCard, { borderColor: colors.border, backgroundColor: colors.background }]}>
          {isImage ? (
            <Pressable onPress={() => setZoomVisible(true)} style={styles.thumbnailWrap}>
              <Image source={{ uri: attached.uri }} style={styles.thumbnail} resizeMode="cover" />
              <View style={styles.zoomBadge}>
                <ZoomIn size={14} color="#fff" />
              </View>
            </Pressable>
          ) : (
            <View style={[styles.docIconWrap, { backgroundColor: colors.muted }]}>
              <FileText size={36} color={colors.primary} />
            </View>
          )}
          <View style={[styles.previewFooter, { flexDirection: dir }]}>
            <Text style={{ flex: 1, color: colors.foreground, fontWeight: "600" }} numberOfLines={1}>
              {attached.name}
            </Text>
            <Pressable
              onPress={() => setAttached(null)}
              style={[styles.removeBtn, { backgroundColor: colors.muted }]}
            >
              <X size={14} color={colors.mutedForeground} />
            </Pressable>
          </View>
        </View>
      ) : (
        <>
          {/* ponytail: native <input type="file"> — no dep, works on all web browsers */}
          <input
            ref={fileInputRef}
            type="file"
            accept="image/*,.pdf"
            style={{ display: "none" }}
            onChange={handleFileChange}
          />
          <Pressable
            onPress={() => fileInputRef.current?.click()}
            style={[styles.uploadBtn, { backgroundColor: colors.background, borderColor: colors.border, flexDirection: dir }]}
          >
            <Upload size={18} color={colors.primary} />
            <Text style={{ color: colors.foreground, fontWeight: "600" }}>
              {isRTL ? "رفع ملف (صورة أو PDF)" : "Upload file (image or PDF)"}
            </Text>
          </Pressable>
        </>
      )}
      {uploading || analyzingImage ? (
        <View style={[styles.uploadingRow, { flexDirection: dir }]}>
          <ActivityIndicator color={colors.primary} />
          <Text style={{ color: colors.mutedForeground }}>
            {analyzingImage
              ? isRTL
                ? "جارٍ تحليل الصورة…"
                : "Analyzing image…"
              : isRTL
                ? "جاري الرفع…"
                : "Uploading…"}
          </Text>
        </View>
      ) : null}
    </SectionCard>
  );

  return (
    <View style={[styles.page, { backgroundColor: colors.background }]}>
      <ScrollView
        style={styles.scroll}
        contentContainerStyle={[styles.scrollContent, isDesktop && styles.scrollContentDesktop]}
        keyboardShouldPersistTaps="handled"
      >
        <View style={styles.container}>
          <View style={[styles.toolbar, { flexDirection: dir }]}>
            <View style={{ flex: 1, gap: 8, minWidth: 0 }}>
              <Pressable onPress={goBack} style={[styles.backBtn, { flexDirection: dir }]}>
                {isRTL ? (
                  <ArrowRight size={18} color={colors.primary} />
                ) : (
                  <ArrowLeft size={18} color={colors.primary} />
                )}
                <Text style={[styles.backText, { color: colors.primary }]}>
                  {isRTL ? "رجوع" : "Back"}
                </Text>
              </Pressable>
              <Text style={[styles.pageTitle, { color: colors.foreground, textAlign }]}>
                {pageTitle}
              </Text>
              <Text style={[styles.pageSubtitle, { color: colors.mutedForeground, textAlign }]}>
                {pageSubtitle}
              </Text>
            </View>
          </View>

          {!hasCategoryParam ? (
            <SectionCard
              title={isRTL ? "الفئة" : "Category"}
              colors={colors}
              textAlign={textAlign}
            >
              <View style={[styles.catRow, { flexDirection: dir }]}>
                {CATEGORY_OPTIONS.filter((c) => availableCategories.includes(c.key)).map((c) => {
                  const sel = category === c.key;
                  return (
                    <Pressable
                      key={c.key}
                      onPress={() => setCategory(c.key)}
                      style={[
                        styles.chip,
                        {
                          backgroundColor: sel ? colors.primary : colors.background,
                          borderColor: sel ? colors.primary : colors.border,
                        },
                      ]}
                    >
                      <Text
                        style={{
                          color: sel ? "#fff" : colors.foreground,
                          fontWeight: "600",
                          fontSize: 13,
                        }}
                      >
                        {isRTL ? c.labelAr : c.labelEn}
                      </Text>
                    </Pressable>
                  );
                })}
              </View>
            </SectionCard>
          ) : null}

          <SectionCard
            title={isRTL ? "جزء الجسم" : "Body part"}
            colors={colors}
            textAlign={textAlign}
          >
            <BodyPartPicker value={bodyPart} onChange={setBodyPart} label="" />
          </SectionCard>

          {isDiagnosis ? (
            <>
              <SectionCard title={isRTL ? "التشخيص" : "Diagnosis"} colors={colors} textAlign={textAlign}>
                <FormField
                  label={isRTL ? "الوصف" : "Description"}
                  value={title}
                  onChange={setTitle}
                  placeholder={isRTL ? "مثال: التهاب الشعب الهوائية" : "e.g. Acute bronchitis"}
                  multiline
                  required
                  colors={colors}
                  textAlign={textAlign}
                />
                <Pressable
                  onPress={() => void completeWithAi()}
                  disabled={!title.trim() || completingAi || uploading}
                  style={({ pressed }) => [
                    {
                      display: aiEnabled ? "flex" : "none",
                      marginTop: 10,
                      flexDirection: isRTL ? "row-reverse" : "row",
                      alignItems: "center",
                      justifyContent: "center",
                      gap: 8,
                      paddingVertical: 12,
                      borderRadius: 12,
                      borderWidth: 1.5,
                      borderColor: colors.primary,
                      backgroundColor: `${colors.primary}12`,
                      opacity: !title.trim() || completingAi || uploading ? 0.55 : pressed ? 0.9 : 1,
                    },
                  ]}
                >
                  {completingAi ? (
                    <ActivityIndicator color={colors.primary} size="small" />
                  ) : (
                    <Sparkles size={16} color={colors.primary} />
                  )}
                  <Text style={{ color: colors.primary, fontWeight: "800", fontSize: 13 }}>
                    {isRTL ? "أكمل بالذكاء الاصطناعي" : "Complete with AI"}
                  </Text>
                </Pressable>
              </SectionCard>
              <View style={gridStyle(twoCol ? 2 : 1)}>
                {renderSymptoms()}
                {renderLinkedDocs()}
              </View>
            </>
          ) : isLabOrXray ? (
            <View style={twoCol ? gridStyle(2) : undefined}>
              <SectionCard
                title={isRTL ? "تفاصيل السجل" : "Record details"}
                colors={colors}
                textAlign={textAlign}
              >
                <FormField
                  label={isRTL ? "العنوان" : "Title"}
                  value={title}
                  onChange={setTitle}
                  placeholder={
                    category === "lab"
                      ? isRTL
                        ? "مثال: CBC، فيتامين د"
                        : "e.g. CBC, Vitamin D"
                      : isRTL
                        ? "مثال: أشعة الصدر"
                        : "e.g. Chest X-ray"
                  }
                  required={!generateAiInsight}
                  colors={colors}
                  textAlign={textAlign}
                />
                <FormField
                  label={isRTL ? "الوصف" : "Description"}
                  value={notes}
                  onChange={setNotes}
                  placeholder={
                    isRTL ? "صف النتيجة أو الملاحظات…" : "Describe the result or findings…"
                  }
                  multiline
                  required={!generateAiInsight}
                  colors={colors}
                  textAlign={textAlign}
                />
              </SectionCard>
              {renderAttachment()}
            </View>
          ) : (
            <SectionCard
              title={isRTL ? "معلومات الفحص" : "Intake information"}
              colors={colors}
              textAlign={textAlign}
            >
              <View style={gridStyle(twoCol ? 2 : 1)}>
                <FormField
                  label={isRTL ? "العنوان" : "Title"}
                  value={title}
                  onChange={setTitle}
                  placeholder={isRTL ? "مثال: التدخين" : "e.g. Smoking history"}
                  colors={colors}
                  textAlign={textAlign}
                />
                <FormField
                  label={isRTL ? "القيمة" : "Value"}
                  value={value}
                  onChange={setValue}
                  placeholder={isRTL ? "مثال: غير مدخن" : "e.g. Non-smoker"}
                  colors={colors}
                  textAlign={textAlign}
                />
              </View>
              <FormField
                label={isRTL ? "ملاحظات" : "Notes"}
                value={notes}
                onChange={setNotes}
                placeholder={isRTL ? "سياق إضافي" : "Any extra context"}
                multiline
                colors={colors}
                textAlign={textAlign}
              />
            </SectionCard>
          )}

        </View>
      </ScrollView>

      <View
        style={[
          styles.stickyFooter,
          { backgroundColor: colors.card, borderTopColor: colors.border, flexDirection: dir },
        ]}
      >
        <Pressable onPress={goBack} style={styles.cancelBtn}>
          <Text style={{ color: colors.mutedForeground, fontWeight: "600" }}>
            {isRTL ? "إلغاء" : "Cancel"}
          </Text>
        </Pressable>
        {saveButton}
      </View>

      {attached && isImage ? (
        <Modal visible={zoomVisible} transparent animationType="fade" onRequestClose={() => setZoomVisible(false)}>
          <View style={styles.zoomBackdrop}>
            <Pressable style={styles.zoomClose} onPress={() => setZoomVisible(false)}>
              <X size={24} color="#fff" />
            </Pressable>
            <ScrollView contentContainerStyle={styles.zoomScroll} maximumZoomScale={4} minimumZoomScale={1} centerContent>
              <Image source={{ uri: attached.uri }} style={{ width: 800, height: 600 }} resizeMode="contain" />
            </ScrollView>
          </View>
        </Modal>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  page: { flex: 1, minHeight: 0, width: "100%" },
  scroll: { flex: 1 },
  scrollContent: {
    flexGrow: 1,
    alignItems: "center",
    paddingHorizontal: 20,
    paddingTop: 16,
    paddingBottom: 32,
  },
  scrollContentDesktop: {
    paddingHorizontal: 32,
    paddingTop: 24,
    paddingBottom: 40,
  },
  container: { width: "100%", gap: 20 },
  toolbar: {
    alignItems: "flex-start",
    justifyContent: "space-between",
    gap: 16,
  },
  backBtn: { alignItems: "center", gap: 8 },
  backText: { fontSize: 14, fontWeight: "600" },
  pageTitle: { fontSize: 26, fontWeight: "800", lineHeight: 32 },
  pageSubtitle: { fontSize: 15, lineHeight: 22, maxWidth: 640 },
  saveBtn: {
    paddingHorizontal: 22,
    paddingVertical: 11,
    borderRadius: 10,
    minWidth: 96,
    alignItems: "center",
    justifyContent: "center",
  },
  saveBtnWeb: {
    cursor: "pointer",
  } as ViewStyle,
  saveBtnText: { color: "#fff", fontWeight: "800", fontSize: 15 },
  sectionCard: {
    borderWidth: 1,
    borderRadius: 16,
    padding: 20,
    gap: 14,
  },
  sectionHeader: { gap: 4 },
  sectionTitle: { fontSize: 16, fontWeight: "800" },
  sectionSubtitle: { fontSize: 13 },
  field: { gap: 8 },
  fieldLabel: { fontSize: 13, fontWeight: "700" },
  insightCard: {
    alignItems: "flex-start",
    gap: 12,
    borderWidth: 1,
    borderRadius: 14,
    paddingHorizontal: 14,
    paddingVertical: 12,
    marginTop: 2,
  },
  insightCheckbox: {
    width: 22,
    height: 22,
    borderRadius: 6,
    borderWidth: 1.5,
    alignItems: "center",
    justifyContent: "center",
    flexShrink: 0,
    marginTop: 2,
  },
  insightCheck: {
    color: "#fff",
    fontSize: 12,
    fontWeight: "800",
  },
  insightContent: {
    flex: 1,
    minWidth: 0,
    gap: 4,
  },
  insightTitle: {
    fontSize: 14,
    fontWeight: "700",
  },
  insightDescription: {
    fontSize: 13,
    lineHeight: 18,
  },
  input: {
    borderRadius: 12,
    borderWidth: 1,
    paddingHorizontal: 14,
    paddingVertical: 12,
    fontSize: 15,
  },
  inputMultiline: { minHeight: 100, textAlignVertical: "top" },
  catRow: { flexWrap: "wrap", gap: 8 },
  chip: { paddingHorizontal: 14, paddingVertical: 8, borderRadius: 14, borderWidth: 1 },
  symptomList: { gap: 8 },
  symptomRow: { alignItems: "center", gap: 8 },
  symptomInput: { flex: 1, minWidth: 0 },
  symptomRemove: {
    width: 36,
    height: 36,
    borderRadius: 10,
    alignItems: "center",
    justifyContent: "center",
  },
  addSymptomBtn: {
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    paddingVertical: 12,
    borderRadius: 12,
    borderWidth: 1,
    borderStyle: "dashed",
  },
  linkRow: {
    alignItems: "center",
    gap: 12,
    padding: 12,
    borderRadius: 12,
    borderWidth: 1,
  },
  linkCheck: {
    width: 22,
    height: 22,
    borderRadius: 6,
    borderWidth: 2,
    alignItems: "center",
    justifyContent: "center",
  },
  pickRow: { gap: 10 },
  pickBtn: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    paddingVertical: 14,
    borderRadius: 12,
    borderWidth: 1,
    minWidth: 0,
  },
  uploadBtn: {
    alignItems: "center",
    justifyContent: "center",
    gap: 10,
    paddingVertical: 16,
    borderRadius: 12,
    borderWidth: 1,
    borderStyle: "dashed",
  },
  previewCard: { borderRadius: 14, borderWidth: 1, overflow: "hidden" },
  thumbnailWrap: { position: "relative" },
  thumbnail: { width: "100%", height: 220 },
  zoomBadge: {
    position: "absolute",
    bottom: 8,
    right: 8,
    backgroundColor: "rgba(0,0,0,0.55)",
    borderRadius: 8,
    padding: 5,
  },
  docIconWrap: { height: 120, alignItems: "center", justifyContent: "center" },
  previewFooter: { alignItems: "center", gap: 10, padding: 12 },
  removeBtn: { width: 28, height: 28, borderRadius: 14, alignItems: "center", justifyContent: "center" },
  uploadingRow: { alignItems: "center", gap: 10, justifyContent: "center", paddingTop: 8 },
  stickyFooter: {
    alignItems: "center",
    justifyContent: "flex-end",
    gap: 12,
    paddingHorizontal: 20,
    paddingVertical: 14,
    borderTopWidth: 1,
    // Pinned height so the Ask AI FAB knows exactly how far to lift.
    minHeight: MEDICAL_FORM_SAVE_BAR_HEIGHT,
  },
  cancelBtn: { paddingHorizontal: 16, paddingVertical: 11 },
  zoomBackdrop: { flex: 1, backgroundColor: "rgba(0,0,0,0.95)" },
  zoomClose: {
    position: "absolute",
    top: 20,
    right: 20,
    zIndex: 10,
    padding: 10,
    borderRadius: 999,
    backgroundColor: "rgba(255,255,255,0.15)",
  },
  zoomScroll: { flexGrow: 1, alignItems: "center", justifyContent: "center" },
});
