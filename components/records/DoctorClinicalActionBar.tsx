import {
  Beaker,
  ChevronDown,
  ClipboardList,
  Pill,
  Plus,
  ScanLine,
  Stethoscope,
} from "lucide-react-native";
import React, { useRef, useState } from "react";
import {
  Modal,
  Platform,
  Pressable,
  StyleSheet,
  Text,
  View,
  type LayoutRectangle,
} from "react-native";
import { EHR } from "@/constants/ehrDesign";
import { useColors } from "@/hooks/useColors";
import { useI18n } from "@/hooks/useI18n";
import { flexRow } from "@/utils/rtl";

export type ClinicalActionKey =
  | "diagnosis"
  | "prescription"
  | "intake"
  | "lab"
  | "xray";

type MenuItem = {
  key: ClinicalActionKey;
  label: string;
  Icon: React.ComponentType<{ size?: number; color?: string }>;
};

type Props = {
  disabled?: boolean;
  onAction: (key: ClinicalActionKey) => void;
};

function ActionDropdown({
  label,
  items,
  primary,
  disabled,
  onSelect,
}: {
  label: string;
  items: MenuItem[];
  primary?: boolean;
  disabled?: boolean;
  onSelect: (key: ClinicalActionKey) => void;
}) {
  const colors = useColors();
  const { isRTL } = useI18n();
  const dir = flexRow(isRTL);
  const [open, setOpen] = useState(false);
  const [anchor, setAnchor] = useState<LayoutRectangle | null>(null);
  const buttonRef = useRef<View>(null);

  const openMenu = () => {
    if (disabled) return;
    buttonRef.current?.measureInWindow((x, y, width, height) => {
      setAnchor({ x, y, width, height });
      setOpen(true);
    });
  };

  return (
    <>
      <View ref={buttonRef} collapsable={false}>
        <Pressable
          onPress={openMenu}
          disabled={disabled}
          accessibilityRole="button"
          style={({ pressed, hovered }: { pressed: boolean; hovered?: boolean }) => [
            styles.dropdownBtn,
            primary ? styles.dropdownPrimary : styles.dropdownSecondary,
            {
              flexDirection: dir,
              backgroundColor: primary
                ? pressed || hovered
                  ? EHR.brand
                  : EHR.brandDark
                : pressed || hovered
                  ? EHR.brandSoftHover
                  : colors.card,
              borderColor: primary ? EHR.brandDark : EHR.border,
              opacity: disabled ? 0.5 : 1,
            },
          ]}
        >
          {!primary ? <Plus size={15} color={EHR.brandDark} /> : null}
          <Text
            style={[
              styles.dropdownLabel,
              { color: primary ? "#fff" : EHR.brandDark },
            ]}
            numberOfLines={1}
          >
            {label}
          </Text>
          <ChevronDown size={14} color={primary ? "#fff" : EHR.text.secondary} />
        </Pressable>
      </View>

      <Modal visible={open} transparent animationType="fade" onRequestClose={() => setOpen(false)}>
        <Pressable style={styles.overlay} onPress={() => setOpen(false)}>
          {anchor ? (
            <View
              style={[
                styles.menu,
                {
                  top: anchor.y + anchor.height + 6,
                  left: Math.max(12, anchor.x + anchor.width - 220),
                  backgroundColor: colors.card,
                  borderColor: EHR.border,
                },
              ]}
            >
              {items.map(({ key, label: itemLabel, Icon }) => (
                <Pressable
                  key={key}
                  onPress={() => {
                    setOpen(false);
                    onSelect(key);
                  }}
                  style={({ pressed }) => [
                    styles.menuRow,
                    { flexDirection: dir, backgroundColor: pressed ? EHR.brandSoft : "transparent" },
                  ]}
                >
                  <View style={[styles.menuIcon, { backgroundColor: EHR.brandSoft }]}>
                    <Icon size={16} color={EHR.brandDark} />
                  </View>
                  <Text style={[styles.menuLabel, { color: EHR.text.primary }]}>{itemLabel}</Text>
                </Pressable>
              ))}
            </View>
          ) : null}
        </Pressable>
      </Modal>
    </>
  );
}

export function DoctorClinicalActionBar({ disabled, onAction }: Props) {
  const { t, isRTL } = useI18n();

  if (disabled) return null;

  const newEntryItems: MenuItem[] = [
    {
      key: "diagnosis",
      label: isRTL ? "تشخيص جديد" : "Add diagnosis",
      Icon: Stethoscope,
    },
    {
      key: "prescription",
      label: isRTL ? "روشتة جديدة" : "Add prescription",
      Icon: Pill,
    },
    {
      key: "intake",
      label: isRTL ? "فحص متابعة" : "Follow-up exam",
      Icon: ClipboardList,
    },
  ];

  const orderTestItems: MenuItem[] = [
    { key: "lab", label: t.records.requestLab, Icon: Beaker },
    { key: "xray", label: t.records.requestXray, Icon: ScanLine },
  ];

  return (
    <View style={[styles.row, { flexDirection: flexRow(isRTL) }]}>
      <ActionDropdown
        label={isRTL ? "إدخال جديد" : "New Entry"}
        items={newEntryItems}
        primary
        disabled={disabled}
        onSelect={onAction}
      />
      <ActionDropdown
        label={isRTL ? "طلب فحص" : "Order Test"}
        items={orderTestItems}
        disabled={disabled}
        onSelect={onAction}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  row: { alignItems: "center", gap: 8, flexShrink: 0 },
  dropdownBtn: {
    alignItems: "center",
    gap: 6,
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: EHR.radius.control,
    borderWidth: 1,
    minHeight: 36,
  },
  dropdownPrimary: {},
  dropdownSecondary: {},
  dropdownLabel: { fontSize: 13, fontWeight: "600" },
  overlay: {
    flex: 1,
    backgroundColor: "rgba(15, 23, 42, 0.2)",
  },
  menu: {
    position: "absolute",
    width: 220,
    borderRadius: EHR.radius.card,
    borderWidth: 1,
    padding: 6,
    ...Platform.select({
      web: { boxShadow: "0 8px 24px rgba(15, 23, 42, 0.12)" } as object,
      default: {
        shadowColor: "#0f172a",
        shadowOffset: { width: 0, height: 8 },
        shadowOpacity: 0.12,
        shadowRadius: 16,
        elevation: 8,
      },
    }),
  },
  menuRow: {
    alignItems: "center",
    gap: 10,
    paddingHorizontal: 8,
    paddingVertical: 10,
    borderRadius: EHR.radius.control,
  },
  menuIcon: {
    width: 30,
    height: 30,
    borderRadius: EHR.radius.control,
    alignItems: "center",
    justifyContent: "center",
  },
  menuLabel: { flex: 1, fontSize: 14, fontWeight: "600" },
});
