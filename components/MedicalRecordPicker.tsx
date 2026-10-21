import { Beaker, ClipboardList, ScanLine, Stethoscope, X } from "lucide-react-native";
import React, { useEffect, useMemo, useState } from "react";
import {
  ActivityIndicator,
  Modal,
  Platform,
  Pressable,
  ScrollView,
  SectionList,
  StyleSheet,
  Text,
  TextInput,
  View,
} from "react-native";
import { AppTextInput } from "@/components/AppTextInput";

import { KeyboardAvoidingView } from "react-native-keyboard-controller";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { MedicalHistoryFilterPanel } from "@/components/MedicalHistoryFilterPanel";
import {
  EMPTY_MEDICAL_FILTERS,
  filterMedicalRecords,
  hasActiveFilters,
  type MedicalHistoryFilters,
} from "@/domains/medical/search";
import type { MedicalCategory, MedicalRecord } from "@/domains/medical/types";
import { useColors } from "@/hooks/useColors";
import { useWebLayout } from "@/hooks/useWebLayout";
import { flexRow } from "@/utils/rtl";

const SECTIONS: {
  key: MedicalCategory;
  labelEn: string;
  labelAr: string;
  Icon: typeof Stethoscope;
}[] = [
  { key: "diagnosis", labelEn: "Diagnoses", labelAr: "التشخيصات", Icon: Stethoscope },
  { key: "lab", labelEn: "Lab results", labelAr: "نتائج المختبر", Icon: Beaker },
  { key: "xray", labelEn: "X-rays & scans", labelAr: "الأشعة والمسح", Icon: ScanLine },
];

const INTAKE_SECTION = {
  key: "intake" as MedicalCategory,
  labelEn: "Intake exams",
  labelAr: "فحوصات الاستقبال",
  Icon: ClipboardList,
};

function formatDate(iso: string, isRTL: boolean): string {
  try {
    return new Date(iso).toLocaleDateString(isRTL ? "ar-EG" : "en-GB", {
      day: "numeric",
      month: "short",
      year: "numeric",
    });
  } catch {
    return "";
  }
}

interface Props {
  visible: boolean;
  records: MedicalRecord[];
  loading?: boolean;
  isRTL: boolean;
  mode?: "share" | "replace";
  initialNote?: string;
  /** Also offer intake exams as a shareable category. */
  includeIntake?: boolean;
  onClose: () => void;
  onSelect: (record: MedicalRecord, note?: string) => void;
}

export function MedicalRecordPicker({
  visible,
  records,
  loading = false,
  isRTL,
  mode = "share",
  initialNote = "",
  includeIntake = false,
  onClose,
  onSelect,
}: Props) {
  const allSections = includeIntake ? [...SECTIONS, INTAKE_SECTION] : SECTIONS;
  const colors = useColors();
  const insets = useSafeAreaInsets();
  const { isMobile } = useWebLayout();
  const isWeb = Platform.OS === "web";
  const isMobileWeb = isWeb && isMobile;
  const useDialog = isWeb && !isMobileWeb;
  const dir = flexRow(isRTL);
  const [filters, setFilters] = useState<MedicalHistoryFilters>(EMPTY_MEDICAL_FILTERS);
  const [selectedRecord, setSelectedRecord] = useState<MedicalRecord | null>(null);
  const [note, setNote] = useState("");

  useEffect(() => {
    if (!visible) {
      setFilters(EMPTY_MEDICAL_FILTERS);
      setSelectedRecord(null);
      setNote("");
    }
  }, [visible]);

  useEffect(() => {
    if (visible && mode === "replace") {
      setNote(initialNote);
    }
  }, [visible, mode, initialNote]);

  const filteredRecords = useMemo(
    () => filterMedicalRecords(records, filters),
    [records, filters],
  );

  const sections = useMemo(() => {
    return allSections.map((section) => ({
      title: isRTL ? section.labelAr : section.labelEn,
      Icon: section.Icon,
      data: filteredRecords.filter((r) => r.category === section.key),
    })).filter((s) => s.data.length > 0);
  }, [filteredRecords, isRTL]);

  const totalShareable = sections.reduce((n, s) => n + s.data.length, 0);
  const filtering = hasActiveFilters(filters);
  const hasRecords = records.length > 0;

  const listHeader = hasRecords ? (
    <View style={styles.listHeader}>
      <MedicalHistoryFilterPanel
        filters={filters}
        onChange={setFilters}
        isRTL={isRTL}
        dir={dir}
        embedded
      />
      {filtering ? (
        <Text
          style={{
            color: colors.mutedForeground,
            fontSize: 12,
            fontWeight: "600",
            textAlign: isRTL ? "right" : "left",
            marginTop: 4,
          }}
        >
          {isRTL
            ? `${totalShareable} من ${records.length} سجل`
            : `${totalShareable} of ${records.length} records`}
        </Text>
      ) : (
        <Text
          style={{
            color: colors.mutedForeground,
            fontSize: 12,
            fontWeight: "600",
            textAlign: isRTL ? "right" : "left",
            marginTop: 4,
          }}
        >
          {isRTL ? `${records.length} سجل` : `${records.length} records`}
        </Text>
      )}
    </View>
  ) : null;

  const sendSelected = () => {
    if (!selectedRecord) return;
    const trimmed = note.trim();
    onSelect(selectedRecord, trimmed || undefined);
  };

  if (selectedRecord) {
    const section = allSections.find((s) => s.key === selectedRecord.category);
    const RecordIcon = section?.Icon ?? Stethoscope;
    const typeLabel = isRTL
      ? section?.labelAr ?? "سجل طبي"
      : section?.labelEn ?? "Medical record";

    return (
      <Modal
        visible={visible}
        animationType={useDialog ? "fade" : "slide"}
        transparent
        onRequestClose={onClose}
      >
        <KeyboardAvoidingView
          style={[styles.overlay, useDialog && styles.overlayWeb, isMobileWeb && styles.overlayMobileWeb]}
          behavior="padding"
          keyboardVerticalOffset={useDialog ? 0 : insets.top}
        >
          {useDialog ? (
            <Pressable
              style={styles.backdrop}
              onPress={onClose}
              accessibilityRole="button"
              accessibilityLabel={isRTL ? "إغلاق" : "Close"}
            />
          ) : (
            <Pressable style={styles.overlayDismiss} onPress={onClose} />
          )}
          <View
            style={[
              styles.confirmSheet,
              useDialog && styles.confirmSheetWeb,
              {
                backgroundColor: colors.card,
                borderColor: colors.border,
                paddingBottom: useDialog ? 20 : Math.max(insets.bottom, 16),
              },
            ]}
          >
            {!useDialog ? (
              <View style={[styles.handle, { backgroundColor: colors.border }]} />
            ) : null}
            <ScrollView
              keyboardShouldPersistTaps="handled"
              bounces={false}
              showsVerticalScrollIndicator={false}
              contentContainerStyle={styles.confirmScroll}
            >
              <View style={[styles.header, { flexDirection: isRTL ? "row-reverse" : "row" }]}>
                <View style={{ flex: 1 }}>
                  <Text style={[styles.title, { color: colors.foreground, textAlign: isRTL ? "right" : "left" }]}>
                    {mode === "replace"
                      ? isRTL
                        ? "تغيير السجل"
                        : "Change record"
                      : isRTL
                        ? "إرسال السجل"
                        : "Send record"}
                  </Text>
                </View>
                <Pressable onPress={onClose} hitSlop={8}>
                  <X size={22} color={colors.foreground} />
                </Pressable>
              </View>

              <View
                style={[
                  styles.confirmCard,
                  { flexDirection: dir, backgroundColor: colors.muted, borderColor: colors.border },
                ]}
              >
                <View style={[styles.confirmIcon, { backgroundColor: `${colors.primary}18` }]}>
                  <RecordIcon size={20} color={colors.primary} />
                </View>
                <View style={{ flex: 1 }}>
                  <Text
                    style={{
                      color: colors.mutedForeground,
                      fontSize: 11,
                      fontWeight: "600",
                      textTransform: "uppercase",
                      textAlign: isRTL ? "right" : "left",
                    }}
                  >
                    {typeLabel}
                  </Text>
                  <Text
                    style={{
                      color: colors.foreground,
                      fontWeight: "700",
                      fontSize: 15,
                      marginTop: 2,
                      textAlign: isRTL ? "right" : "left",
                    }}
                  >
                    {selectedRecord.title}
                  </Text>
                </View>
              </View>

              <Text
                style={[
                  styles.noteLabel,
                  { color: colors.mutedForeground, textAlign: isRTL ? "right" : "left" },
                ]}
              >
                {isRTL ? "رسالة اختيارية" : "Optional message"}
              </Text>
              <AppTextInput
                value={note}
                onChangeText={setNote}
                placeholder={isRTL ? "أضف رسالة…" : "Add a message…"}
                placeholderTextColor={colors.mutedForeground}
                style={[
                  styles.noteInput,
                  {
                    backgroundColor: colors.muted,
                    color: colors.foreground,
                    textAlign: isRTL ? "right" : "left",
                  },
                ]}
                multiline
                maxLength={500}
              />

              <View style={[styles.confirmActions, { flexDirection: dir }]}>
                <Pressable
                  onPress={() => {
                    setSelectedRecord(null);
                    setNote("");
                  }}
                  style={[styles.confirmBtn, { borderColor: colors.border }]}
                >
                  <Text style={{ color: colors.foreground, fontWeight: "600" }}>
                    {isRTL ? "رجوع" : "Back"}
                  </Text>
                </Pressable>
                <Pressable
                  onPress={sendSelected}
                  style={[styles.confirmBtn, styles.confirmSend, { backgroundColor: colors.primary }]}
                >
                  <Text style={{ color: "#fff", fontWeight: "700" }}>
                    {mode === "replace" ? (isRTL ? "تحديث" : "Update") : isRTL ? "إرسال" : "Send"}
                  </Text>
                </Pressable>
              </View>
            </ScrollView>
          </View>
        </KeyboardAvoidingView>
      </Modal>
    );
  }

  return (
    <Modal
      visible={visible}
      animationType={useDialog ? "fade" : "slide"}
      transparent
      onRequestClose={onClose}
    >
      <View
        style={[styles.overlay, useDialog && styles.overlayWeb, isMobileWeb && styles.overlayMobileWeb]}
        accessibilityViewIsModal
      >
        {useDialog ? (
          <Pressable
            style={styles.backdrop}
            onPress={onClose}
            accessibilityRole="button"
            accessibilityLabel={isRTL ? "إغلاق" : "Close"}
          />
        ) : (
          <Pressable style={styles.overlayDismiss} onPress={onClose} />
        )}
        <View
          style={[
            styles.sheet,
            useDialog && styles.sheetWeb,
            {
              backgroundColor: colors.card,
              borderColor: colors.border,
              paddingBottom: isMobileWeb ? Math.max(insets.bottom, 12) : undefined,
            },
          ]}
        >
          {!useDialog ? (
            <View style={[styles.handle, { backgroundColor: colors.border }]} />
          ) : null}
          <View style={[styles.header, { flexDirection: isRTL ? "row-reverse" : "row" }]}>
            <View style={{ flex: 1 }}>
              <Text style={[styles.title, { color: colors.foreground, textAlign: isRTL ? "right" : "left" }]}>
                {isRTL ? "مشاركة سجل طبي" : "Share medical record"}
              </Text>
              <Text
                style={{
                  color: colors.mutedForeground,
                  fontSize: 13,
                  marginTop: 2,
                  textAlign: isRTL ? "right" : "left",
                }}
              >
                {isRTL
                  ? "اختر تشخيصاً أو نتيجة مختبر أو أشعة"
                  : "Choose a diagnosis, lab result, or X-ray"}
              </Text>
            </View>
            <Pressable onPress={onClose} hitSlop={8}>
              <X size={22} color={colors.foreground} />
            </Pressable>
          </View>

          {loading ? (
            <ActivityIndicator color={colors.primary} style={{ marginVertical: 40 }} />
          ) : !hasRecords ? (
            <Text style={{ color: colors.mutedForeground, textAlign: "center", padding: 32 }}>
              {isRTL
                ? "لا توجد سجلات طبية للمشاركة.\nأضف تشخيصاً أو نتيجة مختبر أو أشعة من تبويب السجل."
                : "No medical records to share.\nAdd a diagnosis, lab result, or X-ray from the Records tab."}
            </Text>
          ) : (
            <SectionList
              sections={sections}
              keyExtractor={(item) => item.id}
              style={[styles.list, useDialog && styles.listWeb]}
              contentContainerStyle={styles.listContent}
              stickySectionHeadersEnabled={false}
              ListHeaderComponent={listHeader}
              ListEmptyComponent={
                <Text style={{ color: colors.mutedForeground, textAlign: "center", padding: 32 }}>
                  {filtering
                    ? isRTL
                      ? "لا توجد نتائج تطابق البحث أو التاريخ.\nجرّب تعديل الفلاتر."
                      : "No records match your search or date filter.\nTry adjusting the filters."
                    : isRTL
                      ? "لا توجد سجلات طبية للمشاركة."
                      : "No medical records to share."}
                </Text>
              }
              renderSectionHeader={({ section }) => {
                const Icon = section.Icon;
                return (
                  <View
                    style={[
                      styles.sectionHeader,
                      { flexDirection: isRTL ? "row-reverse" : "row", backgroundColor: colors.muted },
                    ]}
                  >
                    <Icon size={16} color={colors.primary} />
                    <Text
                      style={{
                        color: colors.foreground,
                        fontWeight: "700",
                        fontSize: 13,
                      }}
                    >
                      {section.title}
                    </Text>
                  </View>
                );
              }}
              renderItem={({ item }) => (
                <Pressable
                  onPress={() => setSelectedRecord(item)}
                  style={({ pressed }) => [
                    styles.row,
                    {
                      flexDirection: isRTL ? "row-reverse" : "row",
                      backgroundColor: pressed ? colors.muted : "transparent",
                      borderBottomColor: colors.border,
                    },
                  ]}
                >
                  <View style={{ flex: 1 }}>
                    <Text
                      style={{
                        color: colors.foreground,
                        fontWeight: "600",
                        textAlign: isRTL ? "right" : "left",
                      }}
                      numberOfLines={2}
                    >
                      {item.title}
                    </Text>
                    {item.date ? (
                      <Text
                        style={{
                          color: colors.mutedForeground,
                          fontSize: 12,
                          marginTop: 2,
                          textAlign: isRTL ? "right" : "left",
                        }}
                      >
                        {formatDate(item.date, isRTL)}
                      </Text>
                    ) : null}
                  </View>
                  <Text style={{ color: colors.primary, fontSize: 13, fontWeight: "600" }}>
                    {isRTL ? "اختيار" : "Select"}
                  </Text>
                </Pressable>
              )}
            />
          )}
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    justifyContent: "flex-end",
    backgroundColor: "rgba(0,0,0,0.35)",
  },
  overlayWeb: {
    justifyContent: "center",
    alignItems: "center",
    padding: 24,
    backgroundColor: "rgba(15, 23, 42, 0.48)",
    ...(Platform.OS === "web"
      ? ({
          position: "fixed",
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          zIndex: 1000,
        } as object)
      : null),
  },
  overlayMobileWeb: {
    ...(Platform.OS === "web"
      ? ({
          position: "fixed",
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          zIndex: 1000,
        } as object)
      : null),
  },
  backdrop: {
    ...StyleSheet.absoluteFillObject,
  },
  overlayDismiss: {
    flex: 1,
  },
  sheet: {
    height: "88%",
    maxHeight: "88%",
    width: "100%",
    borderTopLeftRadius: 18,
    borderTopRightRadius: 18,
    paddingTop: 8,
  },
  handle: {
    alignSelf: "center",
    width: 40,
    height: 4,
    borderRadius: 2,
    marginBottom: 10,
  },
  sheetWeb: {
    height: "auto",
    maxHeight: "85vh" as unknown as number,
    width: "100%",
    maxWidth: 560,
    borderRadius: 20,
    borderWidth: 1,
    paddingTop: 16,
    overflow: "hidden",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 12 },
    shadowOpacity: 0.15,
    shadowRadius: 24,
    elevation: 8,
    marginHorizontal: 8,
  },
  header: {
    alignItems: "flex-start",
    gap: 12,
    paddingHorizontal: 16,
    paddingBottom: 12,
  },
  title: { fontSize: 17, fontWeight: "700" },
  listHeader: {
    paddingHorizontal: 16,
    paddingBottom: 8,
  },
  list: {
    flex: 1,
  },
  listWeb: {
    maxHeight: 420,
  },
  listContent: {
    paddingBottom: 24,
    flexGrow: 1,
  },
  sectionHeader: {
    alignItems: "center",
    gap: 8,
    paddingHorizontal: 16,
    paddingVertical: 8,
    marginTop: 4,
  },
  row: {
    alignItems: "center",
    gap: 12,
    paddingHorizontal: 16,
    paddingVertical: 14,
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
  confirmSheet: {
    borderTopLeftRadius: 18,
    borderTopRightRadius: 18,
    paddingTop: 16,
    paddingHorizontal: 16,
    maxHeight: "85%",
  },
  confirmSheetWeb: {
    width: "100%",
    maxWidth: 480,
    maxHeight: "85vh" as unknown as number,
    borderRadius: 20,
    borderWidth: 1,
    marginHorizontal: 8,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 12 },
    shadowOpacity: 0.15,
    shadowRadius: 24,
    elevation: 8,
  },
  confirmScroll: {
    flexGrow: 1,
  },
  confirmCard: {
    alignItems: "center",
    gap: 12,
    padding: 14,
    borderRadius: 14,
    borderWidth: 1,
    marginBottom: 16,
  },
  confirmIcon: {
    width: 40,
    height: 40,
    borderRadius: 10,
    alignItems: "center",
    justifyContent: "center",
  },
  noteLabel: {
    fontSize: 12,
    fontWeight: "700",
    marginBottom: 8,
  },
  noteInput: {
    minHeight: 88,
    maxHeight: 140,
    borderRadius: 14,
    paddingHorizontal: 14,
    paddingVertical: 12,
    fontSize: 14,
    marginBottom: 16,
  },
  confirmActions: {
    gap: 10,
  },
  confirmBtn: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 14,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: "transparent",
  },
  confirmSend: {
    borderWidth: 0,
  },
});
