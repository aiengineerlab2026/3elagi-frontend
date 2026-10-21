import { ChevronDown, ChevronUp } from "lucide-react-native";
import React, { useEffect, useRef, useState } from "react";
import {
  ActivityIndicator,
  Modal,
  Platform,
  Pressable,
  StyleSheet,
  Text,
  View,
} from "react-native";
import {
  MARKET_COUNTRY_CODES,
  countryFlagEmoji,
  marketCurrencyCode,
  normalizeMarketCountry,
  patientCountryLabel,
  type MarketCountryCode,
} from "@/constants/patientCountries";
import { updateAccountProfile } from "@/domains/auth/profile-api";
import { useAuthStore } from "@/domains/auth/store";
import { useColors } from "@/hooks/useColors";
import { useI18n } from "@/hooks/useI18n";
import { showErrorToast } from "@/utils/toast";

type Props = {
  compact?: boolean;
  showLabel?: boolean;
  /** Open above the trigger — use in sidebar/footer. */
  placement?: "top" | "bottom";
  fullWidth?: boolean;
};

type WebMenuPos = {
  top: number;
  left: number;
  width: number;
};

const MENU_MIN_WIDTH = 200;
const MENU_ITEM_HEIGHT = 48;
const IS_WEB = Platform.OS === "web";

export function CountryDropdown({
  compact = false,
  showLabel = false,
  placement = "bottom",
  fullWidth = false,
}: Props) {
  const colors = useColors();
  const { t, isRTL } = useI18n();
  const profile = useAuthStore((s) => s.profile);
  const role = useAuthStore((s) => s.role);
  const accessToken = useAuthStore((s) => s.accessToken);
  const setProfile = useAuthStore((s) => s.setProfile);
  const country = normalizeMarketCountry(profile?.country);
  const [open, setOpen] = useState(false);
  const [saving, setSaving] = useState(false);
  const [webMenuPos, setWebMenuPos] = useState<WebMenuPos | null>(null);
  const triggerRef = useRef<View>(null);
  const opensUp = placement === "top";
  const ChevronIcon = opensUp ? ChevronUp : ChevronDown;
  const flag = countryFlagEmoji(country);
  const label = patientCountryLabel(country, isRTL);
  const currency = marketCurrencyCode(country);

  const openMenu = () => {
    if (saving) return;
    if (IS_WEB && triggerRef.current) {
      triggerRef.current.measureInWindow((x, y, width, height) => {
        const menuWidth = fullWidth ? width : Math.max(MENU_MIN_WIDTH, width);
        const viewportWidth =
          typeof window !== "undefined" ? window.innerWidth : menuWidth;
        const padding = 8;
        let left = fullWidth ? x : isRTL ? x : x + width - menuWidth;
        left = Math.max(
          padding,
          Math.min(left, viewportWidth - menuWidth - padding),
        );
        const menuHeight = MARKET_COUNTRY_CODES.length * MENU_ITEM_HEIGHT + 2;
        let top = opensUp ? y - menuHeight - 6 : y + height + 6;
        if (opensUp && top < padding) top = y + height + 6;
        setWebMenuPos({ top, left, width: menuWidth });
        setOpen(true);
      });
      return;
    }
    setWebMenuPos(null);
    setOpen(true);
  };

  const closeMenu = () => setOpen(false);

  useEffect(() => {
    if (!open) setWebMenuPos(null);
  }, [open]);

  const selectCountry = async (next: MarketCountryCode) => {
    closeMenu();
    if (next === country || !accessToken || !role || !profile) return;
    setSaving(true);
    try {
      const updated = await updateAccountProfile(accessToken, role, {
        name: profile.name,
        phone: profile.phone ?? "",
        country: next,
      });
      setProfile({ ...profile, ...updated, country: next });
    } catch (e) {
      showErrorToast(
        isRTL ? "خطأ" : "Error",
        e instanceof Error ? e.message : "Failed to update country",
      );
    } finally {
      setSaving(false);
    }
  };

  const menu = (
    <View
      style={[
        styles.menu,
        { backgroundColor: colors.card, borderColor: colors.border },
      ]}
    >
      {MARKET_COUNTRY_CODES.map((code) => {
        const active = country === code;
        return (
          <Pressable
            key={code}
            accessibilityRole="menuitem"
            accessibilityState={{ selected: active }}
            onPress={() => void selectCountry(code)}
            style={({ pressed, hovered }: { pressed: boolean; hovered?: boolean }) => [
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
            <Text style={styles.flag}>{countryFlagEmoji(code)}</Text>
            <View style={styles.menuText}>
              <Text
                style={[
                  styles.menuLabel,
                  {
                    color: colors.foreground,
                    textAlign: isRTL ? "right" : "left",
                  },
                ]}
              >
                {patientCountryLabel(code, isRTL)}
              </Text>
              <Text
                style={[
                  styles.menuSub,
                  {
                    color: colors.mutedForeground,
                    textAlign: isRTL ? "right" : "left",
                  },
                ]}
              >
                {marketCurrencyCode(code)}
              </Text>
            </View>
          </Pressable>
        );
      })}
    </View>
  );

  return (
    <View style={[styles.wrap, fullWidth && styles.wrapFullWidth]}>
      <Pressable
        ref={triggerRef}
        accessibilityRole="button"
        accessibilityLabel={t.tabs.country}
        onPress={openMenu}
        disabled={saving}
        style={[
          styles.trigger,
          fullWidth && styles.triggerFullWidth,
          {
            flexDirection: isRTL ? "row-reverse" : "row",
            borderColor: colors.border,
            backgroundColor: colors.card,
            opacity: saving ? 0.7 : 1,
          },
        ]}
      >
        <View
          style={[
            styles.triggerLeading,
            { flexDirection: isRTL ? "row-reverse" : "row" },
          ]}
        >
          {saving ? (
            <ActivityIndicator size="small" color={colors.primary} />
          ) : (
            <Text style={[styles.flag, { fontSize: compact ? 16 : 18 }]}>
              {flag}
            </Text>
          )}
          {showLabel ? (
            <Text
              style={[styles.triggerLabel, { color: colors.foreground }]}
              numberOfLines={1}
            >
              {label} · {currency}
            </Text>
          ) : null}
        </View>
        <ChevronIcon size={compact ? 14 : 16} color={colors.mutedForeground} />
      </Pressable>

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
          {IS_WEB && webMenuPos ? (
            <View
              pointerEvents="box-none"
              style={[
                styles.menuWebFixed,
                {
                  top: webMenuPos.top,
                  left: webMenuPos.left,
                  width: webMenuPos.width,
                },
              ]}
            >
              {menu}
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
                  },
                ]}
              >
                {menu}
              </View>
            </View>
          ) : null}
        </View>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { position: "relative", zIndex: 20 },
  wrapFullWidth: { width: "100%" },
  trigger: {
    alignItems: "center",
    gap: 8,
    borderWidth: 1,
    borderRadius: 999,
    paddingHorizontal: 10,
    paddingVertical: 6,
    cursor: "pointer" as "auto",
  },
  triggerFullWidth: {
    width: "100%",
    borderRadius: 12,
    justifyContent: "space-between",
    paddingHorizontal: 12,
    paddingVertical: 10,
  },
  triggerLeading: {
    alignItems: "center",
    gap: 10,
    flex: 1,
    minWidth: 0,
  },
  triggerLabel: {
    fontSize: 14,
    fontWeight: "700",
    flexShrink: 1,
  },
  flag: { fontSize: 18, lineHeight: 22 },
  modalRoot: { flex: 1 },
  modalBackdrop: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: "transparent",
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
  menuItem: {
    alignItems: "center",
    gap: 12,
    paddingHorizontal: 14,
    paddingVertical: 12,
    cursor: "pointer" as "auto",
  },
  menuText: { flex: 1, gap: 2 },
  menuLabel: { fontSize: 15, fontWeight: "800" },
  menuSub: { fontSize: 12, fontWeight: "600" },
  modalCard: {
    borderWidth: 1,
    borderRadius: 16,
    overflow: "hidden",
  },
});
