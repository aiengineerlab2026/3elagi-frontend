import { Stethoscope, UserRound } from "lucide-react-native";
import React, { useCallback, useEffect, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  Image,
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
import { localFeeCurrency } from "@/components/profile/DoctorFeesFields";
import { patientCountryLabel } from "@/constants/patientCountries";
import {
  createAdminDoctorFromRegistration,
  deleteAdminDoctorRegistration,
  fetchAdminDoctorRegistration,
  fetchAdminDoctorRegistrations,
  type AdminDoctorRegistrationRow,
} from "@/domains/admin/api";
import { useAuthStore } from "@/domains/auth/store";
import { useColors } from "@/hooks/useColors";
import { confirmAction } from "@/utils/confirmAction";
import { showErrorToast, showSuccessToast } from "@/utils/toast";

function fmt(iso: string): string {
  try {
    return new Date(iso).toLocaleString();
  } catch {
    return iso;
  }
}

function showCredentialsAlert(name: string, email: string, password: string) {
  const message = `Doctor "${name}" was created and approved.\n\nEmail: ${email}\nPassword: ${password}\n\nShare these credentials with the doctor.`;
  if (Platform.OS === "web" && typeof window !== "undefined") {
    window.alert(message);
    return;
  }
  Alert.alert("Doctor created", message, [{ text: "OK" }]);
}

function formatRegistrationPrice(value: number | null | undefined): string {
  if (value == null || Number.isNaN(Number(value))) return "Not provided";
  return String(value);
}

function registrationPriceSummary(row: AdminDoctorRegistrationRow): string | null {
  const parts: string[] = [];
  const currency = localFeeCurrency(row.country);
  if (row.price_local != null) {
    parts.push(`${row.price_local} ${currency} local`);
  }
  if (row.price_usd != null) {
    parts.push(`${row.price_usd} USD international`);
  }
  return parts.length ? parts.join(" · ") : null;
}

export default function AdminDoctorRegistrationsWeb() {
  const colors = useColors();
  const { width } = useWindowDimensions();
  const pagePadding = adminPagePadding(width <= 767);
  const compact = width <= 767;
  const accessToken = useAuthStore((s) => s.accessToken);

  const [items, setItems] = useState<AdminDoctorRegistrationRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [expanded, setExpanded] = useState<string | null>(null);
  const [details, setDetails] = useState<Record<string, AdminDoctorRegistrationRow>>({});
  const [loadingDetail, setLoadingDetail] = useState(false);
  const [actingId, setActingId] = useState<string | null>(null);
  const [passwords, setPasswords] = useState<Record<string, string>>({});

  const load = useCallback(async () => {
    if (!accessToken) return;
    setLoading(true);
    try {
      setItems(await fetchAdminDoctorRegistrations(accessToken));
    } catch (e) {
      showErrorToast("Error", (e as Error).message);
    } finally {
      setLoading(false);
    }
  }, [accessToken]);

  useEffect(() => {
    void load();
  }, [load]);

  const toggle = async (id: string) => {
    if (expanded === id) {
      setExpanded(null);
      return;
    }
    setExpanded(id);
    if (!details[id] && accessToken) {
      setLoadingDetail(true);
      try {
        const row = await fetchAdminDoctorRegistration(accessToken, id);
        setDetails((prev) => ({ ...prev, [id]: row }));
        setItems((prev) =>
          prev.map((item) =>
            item.id === id ? { ...item, read_at: row.read_at, photo_url: row.photo_url } : item,
          ),
        );
      } catch (e) {
        showErrorToast("Error", (e as Error).message);
      } finally {
        setLoadingDetail(false);
      }
    }
  };

  const removeRequest = async (item: AdminDoctorRegistrationRow) => {
    if (!accessToken) return;
    const ok = await confirmAction(
      `Remove registration request for "${item.doctor_name}"? This cannot be undone.`,
    );
    if (!ok) return;

    setActingId(item.id);
    try {
      await deleteAdminDoctorRegistration(accessToken, item.id);
      setItems((prev) => prev.filter((row) => row.id !== item.id));
      setDetails((prev) => {
        const next = { ...prev };
        delete next[item.id];
        return next;
      });
      setPasswords((prev) => {
        const next = { ...prev };
        delete next[item.id];
        return next;
      });
      if (expanded === item.id) setExpanded(null);
      showSuccessToast("Registration request removed");
    } catch (e) {
      showErrorToast("Remove failed", (e as Error).message);
    } finally {
      setActingId(null);
    }
  };

  const createDoctor = async (item: AdminDoctorRegistrationRow) => {
    if (!accessToken) return;
    const row = details[item.id] ?? item;
    const password = passwords[item.id]?.trim();
    if (password && password.length < 8) {
      showErrorToast("Invalid password", "Password must be at least 8 characters.");
      return;
    }

    const ok = await confirmAction(
      password
        ? `Create verified doctor account for "${row.doctor_name}" using the password you entered?`
        : `Create verified doctor account for "${row.doctor_name}"? The default password Aa123456 will be used.`,
    );
    if (!ok) return;

    setActingId(item.id);
    try {
      const result = await createAdminDoctorFromRegistration(
        accessToken,
        item.id,
        password || undefined,
      );
      setItems((prev) => prev.filter((row) => row.id !== item.id));
      setDetails((prev) => {
        const next = { ...prev };
        delete next[item.id];
        return next;
      });
      setPasswords((prev) => {
        const next = { ...prev };
        delete next[item.id];
        return next;
      });
      if (expanded === item.id) setExpanded(null);
      showSuccessToast("Doctor created and approved");
      showCredentialsAlert(result.name, result.email, result.password);
    } catch (e) {
      showErrorToast("Create doctor failed", (e as Error).message);
    } finally {
      setActingId(null);
    }
  };

  const renderPhoto = (photoUrl: string | null | undefined, size: "thumb" | "large") => {
    const dim = size === "thumb" ? 52 : 120;
    if (photoUrl) {
      return (
        <Image
          source={{ uri: photoUrl }}
          style={[
            size === "thumb" ? styles.photoThumb : styles.photoLarge,
            { width: dim, height: dim, borderRadius: dim / 2 },
          ]}
          resizeMode="cover"
        />
      );
    }
    return (
      <View
        style={[
          size === "thumb" ? styles.photoThumb : styles.photoLarge,
          {
            width: dim,
            height: dim,
            borderRadius: dim / 2,
            backgroundColor: colors.muted,
            alignItems: "center",
            justifyContent: "center",
          },
        ]}
      >
        <UserRound size={size === "thumb" ? 22 : 40} color={colors.mutedForeground} />
      </View>
    );
  };

  return (
    <AdminShell
      title="Doctor registrations"
      subtitle="Doctors who requested to register and test the app."
    >
      <ScrollView contentContainerStyle={[styles.content, { padding: pagePadding }]}>
        {loading ? (
          <ActivityIndicator color={colors.primary} style={{ marginTop: 24 }} />
        ) : items.length === 0 ? (
          <Text style={{ color: colors.mutedForeground, marginTop: 24 }}>
            No registration requests yet.
          </Text>
        ) : (
          items.map((item) => {
            const open = expanded === item.id;
            const detail = details[item.id];
            const unread = !item.read_at;
            const row = detail ?? item;
            const busy = actingId === item.id;
            const photoUrl = row.photo_url ?? item.photo_url;
            const priceSummary = registrationPriceSummary(row);

            return (
              <View
                key={item.id}
                style={[
                  styles.card,
                  {
                    backgroundColor: colors.card,
                    borderColor: unread ? `${colors.primary}55` : colors.border,
                  },
                ]}
              >
                <Pressable onPress={() => void toggle(item.id)} style={styles.cardHead}>
                  {renderPhoto(photoUrl, "thumb")}
                  <View style={{ flex: 1, gap: 4 }}>
                    <View style={styles.titleRow}>
                      <Stethoscope size={16} color={colors.primary} />
                      <Text style={[styles.cardTitle, { color: colors.foreground }]}>
                        {item.doctor_name}
                      </Text>
                      {unread ? (
                        <View style={[styles.badge, { backgroundColor: colors.primary }]}>
                          <Text style={styles.badgeText}>New</Text>
                        </View>
                      ) : null}
                    </View>
                    <Text style={{ color: colors.mutedForeground, fontSize: 12 }}>
                      {item.email}
                      {" · "}
                      {item.phone}
                      {" · "}
                      {patientCountryLabel(item.country, false)}
                      {" · "}
                      {fmt(item.created_at)}
                    </Text>
                    {!open ? (
                      <>
                        <Text
                          style={{ color: colors.foreground, fontSize: 13, lineHeight: 18 }}
                          numberOfLines={1}
                        >
                          {item.speciality_name_en}
                        </Text>
                        {priceSummary ? (
                          <Text
                            style={{ color: colors.primary, fontSize: 12, fontWeight: "700" }}
                            numberOfLines={1}
                          >
                            {priceSummary}
                          </Text>
                        ) : null}
                      </>
                    ) : null}
                  </View>
                  <Text style={{ color: colors.primary, fontWeight: "700" }}>
                    {open ? "Hide" : "View"}
                  </Text>
                </Pressable>

                {open ? (
                  <View style={[styles.detail, { borderTopColor: colors.border }]}>
                    {loadingDetail && !detail ? (
                      <ActivityIndicator color={colors.primary} />
                    ) : (
                      <View style={{ gap: 12 }}>
                        <View style={styles.photoBlock}>
                          {renderPhoto(photoUrl, "large")}
                          <View style={{ flex: 1, gap: 4 }}>
                            <Text style={{ color: colors.mutedForeground, fontSize: 12 }}>
                              Profile photo from request
                            </Text>
                            <Text style={{ color: colors.foreground, fontWeight: "700" }}>
                              {row.doctor_name}
                            </Text>
                            <Text style={{ color: colors.mutedForeground, fontSize: 13 }}>
                              {row.speciality_name_en}
                            </Text>
                          </View>
                        </View>

                        <View style={{ gap: 8 }}>
                          <Text style={{ color: colors.mutedForeground, fontSize: 12 }}>
                            Speciality
                          </Text>
                          <Text style={[styles.message, { color: colors.foreground }]}>
                            {row.speciality_name_en}
                            {row.speciality_name_ar !== row.speciality_name_en
                              ? ` · ${row.speciality_name_ar}`
                              : ""}
                          </Text>
                          <Text style={{ color: colors.mutedForeground, fontSize: 12 }}>
                            Email
                          </Text>
                          <Text style={{ color: colors.foreground, fontWeight: "600" }}>
                            {row.email}
                          </Text>
                          <Text style={{ color: colors.mutedForeground, fontSize: 12 }}>
                            Phone
                          </Text>
                          <Text style={{ color: colors.foreground, fontWeight: "600" }}>
                            {row.phone}
                          </Text>
                          <Text style={{ color: colors.mutedForeground, fontSize: 12 }}>
                            Country
                          </Text>
                          <Text style={{ color: colors.foreground, fontWeight: "600" }}>
                            {patientCountryLabel(row.country, false)}
                          </Text>
                          {row.clinic_location ? (
                            <>
                              <Text style={{ color: colors.mutedForeground, fontSize: 12 }}>
                                Clinic location
                              </Text>
                              <Text style={{ color: colors.foreground, fontWeight: "600" }}>
                                {row.clinic_location}
                              </Text>
                            </>
                          ) : null}
                        </View>

                        <View
                          style={[
                            styles.pricingBlock,
                            {
                              backgroundColor: `${colors.primary}08`,
                              borderColor: `${colors.primary}33`,
                            },
                          ]}
                        >
                          <Text style={[styles.pricingBlockTitle, { color: colors.foreground }]}>
                            Website consultation price
                          </Text>
                          <Text style={{ color: colors.mutedForeground, fontSize: 12 }}>
                            Shown on the doctor's public profile — verify before creating the account.
                          </Text>
                          <View style={styles.pricingRows}>
                            <View style={styles.pricingRow}>
                              <Text style={{ color: colors.mutedForeground, fontSize: 12 }}>
                                Inside {patientCountryLabel(row.country, false)} (
                                {localFeeCurrency(row.country)})
                              </Text>
                              <Text style={[styles.pricingValue, { color: colors.foreground }]}>
                                {formatRegistrationPrice(row.price_local)}{" "}
                                {row.price_local != null ? localFeeCurrency(row.country) : ""}
                              </Text>
                            </View>
                            <View style={styles.pricingRow}>
                              <Text style={{ color: colors.mutedForeground, fontSize: 12 }}>
                                Outside {patientCountryLabel(row.country, false)} (USD)
                              </Text>
                              <Text style={[styles.pricingValue, { color: colors.foreground }]}>
                                {formatRegistrationPrice(row.price_usd)}{" "}
                                {row.price_usd != null ? "USD" : ""}
                              </Text>
                            </View>
                          </View>
                        </View>

                        <View style={{ gap: 6 }}>
                          <Text style={{ color: colors.mutedForeground, fontSize: 12 }}>
                            Account password (optional)
                          </Text>
                          <AppTextInput
                            value={passwords[item.id] ?? ""}
                            onChangeText={(value) =>
                              setPasswords((prev) => ({ ...prev, [item.id]: value }))
                            }
                            placeholder="Default: Aa123456"
                            secureTextEntry
                            autoCapitalize="none"
                            autoCorrect={false}
                            style={[
                              styles.passwordInput,
                              {
                                backgroundColor: colors.background,
                                borderColor: colors.border,
                                color: colors.foreground,
                              },
                            ]}
                          />
                          <Text style={{ color: colors.mutedForeground, fontSize: 11, lineHeight: 16 }}>
                            Creates an approved doctor with this request&apos;s name, email, phone,
                            country, clinic location, speciality, and profile photo.
                          </Text>
                        </View>

                        <View style={[styles.actions, compact && styles.actionsCompact]}>
                          <Pressable
                            disabled={busy}
                            onPress={() => void createDoctor(item)}
                            style={[
                              styles.createBtn,
                              compact && styles.actionBtnCompact,
                              { backgroundColor: colors.primary, opacity: busy ? 0.65 : 1 },
                            ]}
                          >
                            {busy ? (
                              <ActivityIndicator color={colors.primaryForeground} />
                            ) : (
                              <Text style={[styles.createBtnText, { color: colors.primaryForeground }]}>
                                Create doctor from request
                              </Text>
                            )}
                          </Pressable>
                          <Pressable
                            disabled={busy}
                            onPress={() => void removeRequest(item)}
                            style={[
                              styles.removeBtn,
                              compact && styles.actionBtnCompact,
                              { borderColor: colors.destructive, opacity: busy ? 0.65 : 1 },
                            ]}
                          >
                            <Text style={{ color: colors.destructive, fontWeight: "700" }}>
                              Remove
                            </Text>
                          </Pressable>
                        </View>
                      </View>
                    )}
                  </View>
                ) : null}
              </View>
            );
          })
        )}
      </ScrollView>
    </AdminShell>
  );
}

const styles = StyleSheet.create({
  content: { gap: 12, paddingBottom: 40 },
  card: {
    borderWidth: 1,
    borderRadius: 14,
    overflow: "hidden",
  },
  cardHead: {
    flexDirection: "row",
    alignItems: "flex-start",
    gap: 12,
    padding: 16,
  },
  titleRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    flexWrap: "wrap",
  },
  cardTitle: { fontSize: 16, fontWeight: "800" },
  badge: {
    borderRadius: 999,
    paddingHorizontal: 8,
    paddingVertical: 2,
  },
  badgeText: { color: "#fff", fontSize: 11, fontWeight: "800" },
  detail: {
    paddingHorizontal: 16,
    paddingBottom: 16,
    borderTopWidth: StyleSheet.hairlineWidth,
    paddingTop: 12,
  },
  message: { fontSize: 14, lineHeight: 20 },
  photoThumb: {
    flexShrink: 0,
  },
  photoLarge: {
    flexShrink: 0,
  },
  photoBlock: {
    flexDirection: "row",
    alignItems: "center",
    gap: 14,
  },
  pricingBlock: {
    gap: 8,
    borderWidth: 1,
    borderRadius: 12,
    padding: 12,
  },
  pricingBlockTitle: {
    fontSize: 14,
    fontWeight: "800",
  },
  pricingRows: { gap: 10, marginTop: 4 },
  pricingRow: { gap: 4 },
  pricingValue: {
    fontSize: 16,
    fontWeight: "800",
  },
  passwordInput: {
    borderWidth: 1,
    borderRadius: 10,
    paddingHorizontal: 12,
    paddingVertical: 10,
    fontSize: 15,
  },
  actions: {
    flexDirection: "row",
    gap: 10,
    marginTop: 4,
  },
  actionsCompact: {
    flexDirection: "column",
  },
  actionBtnCompact: {
    width: "100%",
  },
  createBtn: {
    flex: 1,
    borderRadius: 10,
    paddingVertical: 13,
    alignItems: "center",
    justifyContent: "center",
    minHeight: 46,
  },
  createBtnText: {
    fontWeight: "800",
    fontSize: 14,
    textAlign: "center",
  },
  removeBtn: {
    flex: 1,
    borderRadius: 10,
    borderWidth: 1.5,
    paddingVertical: 13,
    alignItems: "center",
    justifyContent: "center",
    minHeight: 46,
  },
});
