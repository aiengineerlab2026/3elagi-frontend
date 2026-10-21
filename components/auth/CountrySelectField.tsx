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
import {
  CONTINENT_LABELS,
  countryFlagEmoji,
  filterWorldCountries,
  patientCountryLabel,
  type PatientCountryCode,
  type WorldContinent,
  type WorldCountry,
} from "@/constants/patientCountries";
import { useColors } from "@/hooks/useColors";
import { useI18n } from "@/hooks/useI18n";

type Props = {
  label: string;
  value: PatientCountryCode;
  onChange: (code: PatientCountryCode) => void;
  codes: readonly PatientCountryCode[];
  error?: string;
  isRTL: boolean;
  disabled?: boolean;
};

type MenuPos = {
  top: number;
  left: number;
  width: number;
  maxHeight: number;
};

type ListRow =
  | { kind: "continent"; continent: WorldContinent }
  | { kind: "country"; country: WorldCountry };

const MENU_ITEM_HEIGHT = 48;
const MENU_MAX_HEIGHT = 360;
const SEARCH_BLOCK = 52;
const VIEWPORT_PADDING = 8;
const GAP = 6;
const IS_WEB = Platform.OS === "web";
const CONTINENT_ORDER: WorldContinent[] = [
  "AF",
  "AS",
  "EU",
  "NA",
  "SA",
  "OC",
  "AN",
];

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

function buildRows(countries: readonly WorldCountry[]): ListRow[] {
  const byContinent = new Map<WorldContinent, WorldCountry[]>();
  for (const c of CONTINENT_ORDER) byContinent.set(c, []);
  for (const country of countries) {
    byContinent.get(country.continent)?.push(country);
  }
  const rows: ListRow[] = [];
  for (const continent of CONTINENT_ORDER) {
    const list = byContinent.get(continent) ?? [];
    if (!list.length) continue;
    rows.push({ kind: "continent", continent });
    for (const country of list) {
      rows.push({ kind: "country", country });
    }
  }
  return rows;
}

/** Labeled country dropdown with autocomplete for patient signup. */
export function CountrySelectField({
  label,
  value,
  onChange,
  codes,
  error,
  isRTL,
  disabled,
}: Props) {
  const colors = useColors();
  const { t } = useI18n();
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");
  const [menuPos, setMenuPos] = useState<MenuPos | null>(null);
  const triggerRef = useRef<View>(null);
  const searchRef = useRef<TextInput>(null);
  const flag = countryFlagEmoji(value);
  const selectedLabel = patientCountryLabel(value, isRTL);

  const filtered = useMemo(
    () => filterWorldCountries(query, isRTL, codes),
    [query, isRTL, codes],
  );
  const rows = useMemo(() => buildRows(filtered), [filtered]);

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

  const select = (code: PatientCountryCode) => {
    closeMenu();
    if (code !== value) onChange(code);
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
          placeholder={t.auth.countrySearchPlaceholder}
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
        {rows.length === 0 ? (
          <Text
            style={[
              styles.empty,
              {
                color: colors.mutedForeground,
                textAlign: isRTL ? "right" : "left",
              },
            ]}
          >
            {t.auth.countryNoResults}
          </Text>
        ) : (
          rows.map((row) => {
            if (row.kind === "continent") {
              return (
                <Text
                  key={`c-${row.continent}`}
                  style={[
                    styles.continent,
                    {
                      color: colors.mutedForeground,
                      textAlign: isRTL ? "right" : "left",
                      backgroundColor: colors.muted,
                    },
                  ]}
                >
                  {isRTL
                    ? CONTINENT_LABELS[row.continent].ar
                    : CONTINENT_LABELS[row.continent].en}
                </Text>
              );
            }

            const { country } = row;
            const active = value === country.code;
            return (
              <Pressable
                key={country.code}
                accessibilityRole="menuitem"
                accessibilityState={{ selected: active }}
                onPress={() => select(country.code)}
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
                <Text style={styles.flag}>{countryFlagEmoji(country.code)}</Text>
                <Text
                  style={[
                    styles.menuLabel,
                    {
                      color: active ? colors.primary : colors.foreground,
                      textAlign: isRTL ? "right" : "left",
                    },
                  ]}
                >
                  {patientCountryLabel(country.code, isRTL)}
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
      {label ? (
        <Text
          style={[
            styles.label,
            { color: colors.foreground, textAlign: isRTL ? "right" : "left" },
          ]}
        >
          {label}
        </Text>
      ) : null}

      <View ref={triggerRef} collapsable={false}>
        <Pressable
          accessibilityRole="button"
          accessibilityLabel={label || "Country"}
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
          <View
            style={[
              styles.triggerLeading,
              { flexDirection: isRTL ? "row-reverse" : "row" },
            ]}
          >
            <Text style={styles.flag}>{flag}</Text>
            <Text
              style={[styles.triggerLabel, { color: colors.foreground }]}
              numberOfLines={1}
            >
              {selectedLabel}
            </Text>
          </View>
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
            accessibilityLabel="Close country menu"
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
  triggerLeading: {
    alignItems: "center",
    gap: 10,
    flex: 1,
    minWidth: 0,
  },
  triggerLabel: { fontSize: 15, fontWeight: "700", flexShrink: 1 },
  flag: { fontSize: 18, lineHeight: 22 },
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
    borderRadius: 16,
    overflow: "hidden",
  },
  searchRow: {
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
  continent: {
    fontSize: 11,
    fontWeight: "800",
    letterSpacing: 0.4,
    textTransform: "uppercase",
    paddingHorizontal: 14,
    paddingVertical: 8,
  },
  empty: {
    fontSize: 13,
    fontWeight: "600",
    paddingHorizontal: 14,
    paddingVertical: 18,
  },
  menuItem: {
    alignItems: "center",
    gap: 12,
    paddingHorizontal: 14,
    paddingVertical: 12,
    minHeight: MENU_ITEM_HEIGHT,
    cursor: "pointer" as "auto",
  },
  menuLabel: { fontSize: 15, fontWeight: "700", flex: 1 },
});
