import { ChevronDown, Search } from "lucide-react-native";
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
import type { Speciality } from "@/domains/home/api";
import { specialityLabel } from "@/domains/home/specialityLabel";
import { useColors } from "@/hooks/useColors";
import { useI18n } from "@/hooks/useI18n";

type Props = {
  label: string;
  value: string;
  onChange: (id: string) => void;
  specialities: Speciality[];
  error?: string;
  disabled?: boolean;
};

type MenuPos = {
  top: number;
  left: number;
  width: number;
  maxHeight: number;
};

const MENU_ITEM_HEIGHT = 48;
const MENU_MAX_HEIGHT = 360;
const SEARCH_BLOCK = 52;
const VIEWPORT_PADDING = 8;
const GAP = 6;
const IS_WEB = Platform.OS === "web";

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

/** Searchable speciality dropdown for doctor signup. */
export function SpecialitySelectField({
  label,
  value,
  onChange,
  specialities,
  error,
  disabled,
}: Props) {
  const colors = useColors();
  const { isRTL, locale } = useI18n();
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");
  const [menuPos, setMenuPos] = useState<MenuPos | null>(null);
  const triggerRef = useRef<View>(null);
  const searchRef = useRef<TextInput>(null);

  const selected = useMemo(
    () => specialities.find((s) => s.id === value) ?? null,
    [specialities, value],
  );
  const selectedLabel = selected
    ? specialityLabel(selected, locale)
    : isRTL
      ? "اختر التخصص…"
      : "Select speciality…";

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    return specialities.filter(
      (s) =>
        !q ||
        specialityLabel(s, locale).toLowerCase().includes(q) ||
        s.nameEn.toLowerCase().includes(q) ||
        s.nameAr.includes(query.trim()),
    );
  }, [specialities, query, locale]);

  const openMenu = () => {
    if (disabled) return;
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

  const select = (id: string) => {
    closeMenu();
    if (id !== value) onChange(id);
  };

  const listMaxHeight = Math.max(
    120,
    (menuPos?.maxHeight ?? MENU_MAX_HEIGHT) - SEARCH_BLOCK,
  );

  const menuBody = (
    <>
      <View
        style={[
          styles.searchRow,
          {
            flexDirection: isRTL ? "row-reverse" : "row",
            borderBottomColor: colors.border,
            backgroundColor: colors.card,
          },
        ]}
      >
        <Search size={16} color={colors.mutedForeground} />
        <TextInput
          ref={searchRef}
          value={query}
          onChangeText={setQuery}
          placeholder={isRTL ? "ابحث عن تخصص…" : "Search specialities…"}
          placeholderTextColor={colors.mutedForeground}
          autoCorrect={false}
          autoCapitalize="none"
          style={[
            styles.searchInput,
            {
              color: colors.foreground,
              textAlign: isRTL ? "right" : "left",
            },
          ]}
        />
      </View>

      <ScrollView
        style={{ maxHeight: listMaxHeight }}
        nestedScrollEnabled
        keyboardShouldPersistTaps="handled"
        showsVerticalScrollIndicator
      >
        {filtered.length === 0 ? (
          <Text
            style={[
              styles.empty,
              {
                color: colors.mutedForeground,
                textAlign: isRTL ? "right" : "left",
              },
            ]}
          >
            {isRTL ? "لا توجد نتائج" : "No matches"}
          </Text>
        ) : (
          filtered.map((spec) => {
            const active = value === spec.id;
            return (
              <Pressable
                key={spec.id}
                accessibilityRole="menuitem"
                accessibilityState={{ selected: active }}
                onPress={() => select(spec.id)}
                style={({
                  pressed,
                  hovered,
                }: {
                  pressed: boolean;
                  hovered?: boolean;
                }) => [
                  styles.menuItem,
                  {
                    flexDirection: isRTL ? "row-reverse" : "row",
                    backgroundColor: active
                      ? `${colors.primary}12`
                      : pressed || hovered
                        ? colors.muted
                        : "transparent",
                  },
                ]}
              >
                <Text
                  style={[
                    styles.menuLabel,
                    {
                      color: active ? colors.primary : colors.foreground,
                      textAlign: isRTL ? "right" : "left",
                    },
                  ]}
                >
                  {specialityLabel(spec, locale)}
                </Text>
              </Pressable>
            );
          })
        )}
      </ScrollView>
    </>
  );

  return (
    <View style={styles.wrap}>
      <Text
        style={[
          styles.label,
          { color: colors.foreground, textAlign: isRTL ? "right" : "left" },
        ]}
      >
        {label}
      </Text>

      <View ref={triggerRef} collapsable={false}>
        <Pressable
          accessibilityRole="button"
          accessibilityLabel={label}
          disabled={disabled}
          onPress={openMenu}
          style={({
            pressed,
            hovered,
          }: {
            pressed: boolean;
            hovered?: boolean;
          }) => [
            styles.trigger,
            {
              flexDirection: isRTL ? "row-reverse" : "row",
              borderColor: error ? colors.destructive : colors.border,
              backgroundColor:
                pressed || hovered ? colors.muted : colors.card,
              opacity: disabled ? 0.6 : 1,
            },
          ]}
        >
          <Text
            style={[
              styles.triggerLabel,
              {
                color: selected ? colors.foreground : colors.mutedForeground,
                textAlign: isRTL ? "right" : "left",
              },
            ]}
            numberOfLines={1}
          >
            {selectedLabel}
          </Text>
          <ChevronDown size={18} color={colors.mutedForeground} />
        </Pressable>
      </View>

      {error ? (
        <Text style={[styles.error, { color: colors.destructive }]}>{error}</Text>
      ) : null}

      <Modal
        visible={open}
        transparent
        animationType={IS_WEB ? "none" : "fade"}
        onRequestClose={closeMenu}
      >
        <View style={styles.modalRoot}>
          <Pressable
            style={styles.modalBackdrop}
            onPress={closeMenu}
            accessibilityRole="button"
            accessibilityLabel="Close speciality menu"
          />
          {IS_WEB && menuPos ? (
            <View
              pointerEvents="box-none"
              style={[
                styles.menuWebFixed,
                {
                  top: menuPos.top,
                  left: menuPos.left,
                  width: menuPos.width,
                },
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
  wrap: { gap: 8, width: "100%", zIndex: 20 },
  label: { fontSize: 13, fontWeight: "700" },
  trigger: {
    alignItems: "center",
    justifyContent: "space-between",
    gap: 10,
    borderWidth: 1,
    borderRadius: 12,
    paddingHorizontal: 14,
    paddingVertical: 12,
    cursor: "pointer" as "auto",
  },
  triggerLabel: { fontSize: 15, fontWeight: "700", flex: 1, minWidth: 0 },
  error: { fontSize: 12, fontWeight: "600" },
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
    borderRadius: 14,
    overflow: "hidden",
    width: "100%",
    maxWidth: 480,
    alignSelf: "center",
  },
  searchRow: {
    alignItems: "center",
    gap: 8,
    paddingHorizontal: 12,
    paddingVertical: 10,
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
  searchInput: { flex: 1, fontSize: 15, paddingVertical: 4 },
  empty: { fontSize: 13, padding: 16 },
  menuItem: {
    alignItems: "center",
    minHeight: MENU_ITEM_HEIGHT,
    paddingHorizontal: 14,
    paddingVertical: 12,
  },
  menuLabel: { fontSize: 15, fontWeight: "600", flex: 1 },
});
