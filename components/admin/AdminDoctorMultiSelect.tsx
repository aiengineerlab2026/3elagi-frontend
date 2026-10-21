import { Check, ChevronDown, Search, X } from "lucide-react-native";
import React, { useEffect, useMemo, useRef, useState } from "react";
import {
  Modal,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from "react-native";
import type { AdminDoctorRow } from "@/domains/admin/api";
import { DEFAULT_DOCTOR_WELCOME_PASSWORD } from "@/domains/admin/constants";
import { useColors } from "@/hooks/useColors";

type Props = {
  doctors: AdminDoctorRow[];
  selectedIds: string[];
  onChange: (ids: string[]) => void;
  loading?: boolean;
  label?: string;
  placeholder?: string;
};

type MenuPos = {
  top: number;
  left: number;
  width: number;
  maxHeight: number;
};

const MENU_ITEM_HEIGHT = 52;
const MENU_MAX_HEIGHT = 360;
const SEARCH_BLOCK = 52;
const VIEWPORT_PADDING = 8;
const GAP = 6;
const IS_WEB = Platform.OS === "web";

function doctorPassword(doctor: AdminDoctorRow): string {
  return doctor.welcome_password?.trim() || DEFAULT_DOCTOR_WELCOME_PASSWORD;
}

function measureTrigger(
  node: View | null,
  cb: (x: number, y: number, width: number, height: number) => void,
): void {
  if (!node) return;

  if (IS_WEB) {
    const host = node as unknown as HTMLElement & {
      getBoundingClientRect?: () => DOMRect;
    };
    const el =
      typeof host.getBoundingClientRect === "function"
        ? host
        : ((host as unknown as { _node?: HTMLElement })._node ?? null);
    if (el && typeof el.getBoundingClientRect === "function") {
      const rect = el.getBoundingClientRect();
      cb(rect.left, rect.top, rect.width, rect.height);
      return;
    }
  }

  node.measureInWindow((x, y, width, height) => cb(x, y, width, height));
}

function computeMenuPos(
  x: number,
  y: number,
  width: number,
  height: number,
): MenuPos {
  const viewportWidth =
    typeof window !== "undefined" ? window.innerWidth : width + 32;
  const viewportHeight =
    typeof window !== "undefined" ? window.innerHeight : 800;

  const left = Math.max(
    VIEWPORT_PADDING,
    Math.min(x, viewportWidth - width - VIEWPORT_PADDING),
  );

  let top = y + height + GAP;
  let maxHeight = MENU_MAX_HEIGHT;
  const spaceBelow = viewportHeight - VIEWPORT_PADDING - top;
  const spaceAbove = y - GAP - VIEWPORT_PADDING;

  if (spaceBelow < 220 && spaceAbove > spaceBelow) {
    maxHeight = Math.min(MENU_MAX_HEIGHT, spaceAbove);
    top = y - GAP - maxHeight;
  } else {
    maxHeight = Math.min(MENU_MAX_HEIGHT, Math.max(spaceBelow, 180));
  }

  return { top, left, width, maxHeight };
}

function filterDoctors(doctors: AdminDoctorRow[], query: string): AdminDoctorRow[] {
  const q = query.trim().toLowerCase();
  if (!q) return doctors;
  return doctors.filter((doctor) => {
    const haystack = [
      doctor.name,
      doctor.email ?? "",
      doctor.phone ?? "",
      doctor.speciality?.name_en ?? "",
      doctor.speciality?.name_ar ?? "",
    ]
      .join(" ")
      .toLowerCase();
    return haystack.includes(q);
  });
}

export function AdminDoctorMultiSelect({
  doctors,
  selectedIds,
  onChange,
  loading = false,
  label = "Doctors",
  placeholder = "Search and select doctors…",
}: Props) {
  const colors = useColors();
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");
  const [menuPos, setMenuPos] = useState<MenuPos | null>(null);
  const triggerRef = useRef<View>(null);
  const searchRef = useRef<TextInput>(null);

  const selectedSet = useMemo(() => new Set(selectedIds), [selectedIds]);
  const selectedDoctors = useMemo(
    () => doctors.filter((doctor) => selectedSet.has(doctor.id)),
    [doctors, selectedSet],
  );
  const filtered = useMemo(
    () => filterDoctors(doctors, query),
    [doctors, query],
  );

  const triggerLabel =
    selectedDoctors.length === 0
      ? placeholder
      : selectedDoctors.length === 1
        ? selectedDoctors[0].name
        : `${selectedDoctors.length} doctors selected`;

  const openMenu = () => {
    if (loading) return;
    const apply = () => {
      measureTrigger(triggerRef.current, (x, y, width, height) => {
        setMenuPos(computeMenuPos(x, y, width, height));
        setOpen(true);
        setQuery("");
      });
    };
    if (IS_WEB && typeof requestAnimationFrame === "function") {
      requestAnimationFrame(() => requestAnimationFrame(apply));
      return;
    }
    apply();
  };

  const closeMenu = () => {
    setOpen(false);
    setQuery("");
  };

  useEffect(() => {
    if (!open) {
      setMenuPos(null);
      return;
    }
    const focusTimer = setTimeout(() => searchRef.current?.focus(), 50);
    if (!IS_WEB || typeof window === "undefined") {
      return () => clearTimeout(focusTimer);
    }

    const reposition = () => {
      measureTrigger(triggerRef.current, (x, y, width, height) => {
        setMenuPos(computeMenuPos(x, y, width, height));
      });
    };

    window.addEventListener("resize", reposition);
    window.addEventListener("scroll", reposition, true);
    return () => {
      clearTimeout(focusTimer);
      window.removeEventListener("resize", reposition);
      window.removeEventListener("scroll", reposition, true);
    };
  }, [open]);

  const toggleDoctor = (doctorId: string) => {
    if (selectedSet.has(doctorId)) {
      onChange(selectedIds.filter((id) => id !== doctorId));
      return;
    }
    onChange([...selectedIds, doctorId]);
  };

  const removeDoctor = (doctorId: string) => {
    onChange(selectedIds.filter((id) => id !== doctorId));
  };

  const selectAllFiltered = () => {
    const merged = new Set(selectedIds);
    for (const doctor of filtered) merged.add(doctor.id);
    onChange(Array.from(merged));
  };

  const clearAll = () => onChange([]);

  const listMaxHeight = Math.max(
    120,
    (menuPos?.maxHeight ?? MENU_MAX_HEIGHT) - SEARCH_BLOCK - 44,
  );

  const menuBody = (
    <>
      <View
        style={[
          styles.searchRow,
          { borderBottomColor: colors.border, backgroundColor: colors.card },
        ]}
      >
        <Search size={16} color={colors.mutedForeground} />
        <TextInput
          ref={searchRef}
          value={query}
          onChangeText={setQuery}
          placeholder="Search by name, email, speciality…"
          placeholderTextColor={colors.mutedForeground}
          autoCorrect={false}
          autoCapitalize="none"
          style={[styles.searchInput, { color: colors.foreground }]}
        />
      </View>

      <View style={[styles.menuToolbar, { borderBottomColor: colors.border }]}>
        <Pressable onPress={selectAllFiltered}>
          <Text style={[styles.toolbarAction, { color: colors.primary }]}>
            {query.trim() ? "Select filtered" : "Select all"}
          </Text>
        </Pressable>
        <Pressable onPress={clearAll}>
          <Text style={[styles.toolbarAction, { color: colors.mutedForeground }]}>
            Clear
          </Text>
        </Pressable>
      </View>

      <ScrollView
        style={{ maxHeight: listMaxHeight }}
        nestedScrollEnabled
        keyboardShouldPersistTaps="handled"
      >
        {filtered.length === 0 ? (
          <Text style={[styles.empty, { color: colors.mutedForeground }]}>
            No doctors match your search
          </Text>
        ) : (
          filtered.map((doctor) => {
            const active = selectedSet.has(doctor.id);
            return (
              <Pressable
                key={doctor.id}
                onPress={() => toggleDoctor(doctor.id)}
                style={({ pressed, hovered }: { pressed: boolean; hovered?: boolean }) => [
                  styles.menuItem,
                  {
                    backgroundColor: active
                      ? `${colors.primary}12`
                      : pressed || hovered
                        ? colors.muted
                        : "transparent",
                  },
                ]}
              >
                <View
                  style={[
                    styles.checkbox,
                    {
                      borderColor: active ? colors.primary : colors.border,
                      backgroundColor: active ? colors.primary : "transparent",
                    },
                  ]}
                >
                  {active ? <Check size={14} color={colors.primaryForeground} /> : null}
                </View>
                <View style={styles.menuText}>
                  <Text
                    style={[
                      styles.menuName,
                      { color: active ? colors.primary : colors.foreground },
                    ]}
                  >
                    {doctor.name}
                  </Text>
                  <Text style={[styles.menuMeta, { color: colors.mutedForeground }]}>
                    {doctor.email?.trim() || "No email"}
                    {" · "}
                    {doctorPassword(doctor)}
                  </Text>
                </View>
              </Pressable>
            );
          })
        )}
      </ScrollView>
    </>
  );

  return (
    <View style={styles.wrap}>
      {label ? (
        <Text style={[styles.label, { color: colors.foreground }]}>{label}</Text>
      ) : null}

      <View ref={triggerRef} collapsable={false}>
        <Pressable
          onPress={openMenu}
          disabled={loading}
          style={({ pressed, hovered }: { pressed: boolean; hovered?: boolean }) => [
            styles.trigger,
            {
              borderColor: colors.border,
              backgroundColor: pressed || hovered ? colors.muted : colors.background,
              opacity: loading ? 0.7 : 1,
            },
          ]}
        >
          <Text
            style={[
              styles.triggerLabel,
              {
                color:
                  selectedDoctors.length > 0
                    ? colors.foreground
                    : colors.mutedForeground,
              },
            ]}
            numberOfLines={1}
          >
            {loading ? "Loading doctors…" : triggerLabel}
          </Text>
          <ChevronDown size={18} color={colors.mutedForeground} />
        </Pressable>
      </View>

      {selectedDoctors.length ? (
        <View style={styles.chipRow}>
          {selectedDoctors.map((doctor) => (
            <View
              key={doctor.id}
              style={[
                styles.chip,
                { borderColor: colors.border, backgroundColor: `${colors.primary}10` },
              ]}
            >
              <Text style={[styles.chipText, { color: colors.foreground }]}>
                {doctor.name}
              </Text>
              <Pressable
                onPress={() => removeDoctor(doctor.id)}
                hitSlop={8}
                accessibilityLabel={`Remove ${doctor.name}`}
              >
                <X size={14} color={colors.mutedForeground} />
              </Pressable>
            </View>
          ))}
        </View>
      ) : null}

      <Modal visible={open} transparent animationType={IS_WEB ? "none" : "fade"} onRequestClose={closeMenu}>
        <View style={styles.modalRoot}>
          <Pressable style={styles.modalBackdrop} onPress={closeMenu} />
          {IS_WEB && menuPos ? (
            <View
              pointerEvents="box-none"
              style={[
                styles.menuWebFixed,
                { top: menuPos.top, left: menuPos.left, width: menuPos.width },
              ]}
            >
              <View
                style={[
                  styles.menu,
                  {
                    backgroundColor: colors.card,
                    borderColor: colors.border,
                    maxHeight: menuPos.maxHeight,
                  },
                ]}
              >
                {menuBody}
              </View>
            </View>
          ) : null}
          {!IS_WEB ? (
            <View style={styles.modalCenter} pointerEvents="box-none">
              <View
                style={[
                  styles.modalCard,
                  {
                    backgroundColor: colors.card,
                    borderColor: colors.border,
                    maxHeight: MENU_MAX_HEIGHT,
                  },
                ]}
              >
                {menuBody}
              </View>
            </View>
          ) : null}
        </View>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { gap: 8, width: "100%" },
  label: { fontSize: 13, fontWeight: "700" },
  trigger: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    gap: 10,
    borderWidth: 1,
    borderRadius: 12,
    paddingHorizontal: 14,
    paddingVertical: 12,
    cursor: "pointer" as "auto",
  },
  triggerLabel: { fontSize: 14, fontWeight: "600", flex: 1 },
  chipRow: { flexDirection: "row", flexWrap: "wrap", gap: 8 },
  chip: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    borderWidth: 1,
    borderRadius: 999,
    paddingHorizontal: 10,
    paddingVertical: 6,
  },
  chipText: { fontSize: 12, fontWeight: "700" },
  modalRoot: { flex: 1 },
  modalBackdrop: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: IS_WEB ? "transparent" : "rgba(0,0,0,0.35)",
  },
  menuWebFixed: { position: "absolute", zIndex: 2 },
  modalCenter: {
    flex: 1,
    justifyContent: "center",
    padding: 24,
    zIndex: 2,
  },
  menu: {
    borderWidth: 1,
    borderRadius: 14,
    overflow: "hidden",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.12,
    shadowRadius: 12,
    elevation: 8,
  },
  modalCard: {
    borderWidth: 1,
    borderRadius: 16,
    overflow: "hidden",
  },
  searchRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    paddingHorizontal: 12,
    paddingVertical: 10,
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
  searchInput: {
    flex: 1,
    fontSize: 14,
    fontWeight: "600",
    paddingVertical: 4,
    outlineStyle: "none" as "none",
  },
  menuToolbar: {
    flexDirection: "row",
    justifyContent: "space-between",
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
  toolbarAction: { fontSize: 12, fontWeight: "700" },
  empty: {
    fontSize: 13,
    fontWeight: "600",
    paddingHorizontal: 14,
    paddingVertical: 18,
  },
  menuItem: {
    flexDirection: "row",
    alignItems: "flex-start",
    gap: 12,
    paddingHorizontal: 14,
    paddingVertical: 12,
    minHeight: MENU_ITEM_HEIGHT,
    cursor: "pointer" as "auto",
  },
  checkbox: {
    width: 20,
    height: 20,
    borderRadius: 6,
    borderWidth: 1.5,
    alignItems: "center",
    justifyContent: "center",
    marginTop: 2,
  },
  menuText: { flex: 1, gap: 2 },
  menuName: { fontSize: 14, fontWeight: "700", lineHeight: 20 },
  menuMeta: { fontSize: 12, lineHeight: 17 },
});
