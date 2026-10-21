import React, { useCallback, useEffect, useMemo, useState } from "react";
import { ActivityIndicator, ScrollView, Text, View } from "react-native";
import { AdminShell } from "@/components/admin/AdminShell";
import { Button, Chip, Field, Muted, Section, surgeryStyles } from "@/components/surgery/ui";
import { fetchAdminSpecialities, type AdminSpecialityRow } from "@/domains/admin/api";
import { useAuthStore } from "@/domains/auth/store";
import {
  adminDeleteOperation,
  adminFetchOperations,
  adminSaveOperation,
  type SurgicalOperation,
} from "@/domains/surgery/api";
import { useColors } from "@/hooks/useColors";
import { showErrorToast, showSuccessToast } from "@/utils/toast";

const EMPTY = { name_en: "", name_ar: "", speciality_id: "", is_active: true };

export default function AdminSurgicalOperations() {
  const colors = useColors();
  const token = useAuthStore((s) => s.accessToken);
  const [ops, setOps] = useState<SurgicalOperation[]>([]);
  const [specialities, setSpecialities] = useState<AdminSpecialityRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [form, setForm] = useState(EMPTY);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [filter, setFilter] = useState<string>("");

  const load = useCallback(async () => {
    if (!token) return;
    setLoading(true);
    try {
      const [o, s] = await Promise.all([adminFetchOperations(token), fetchAdminSpecialities(token)]);
      setOps(o);
      setSpecialities(s);
    } catch (e) {
      showErrorToast("Failed to load operations", (e as Error).message);
    } finally {
      setLoading(false);
    }
  }, [token]);

  useEffect(() => {
    void load();
  }, [load]);

  const save = async () => {
    if (!token) return;
    if (!form.name_en.trim() || !form.name_ar.trim() || !form.speciality_id) {
      showErrorToast("Missing fields", "English name, Arabic name and speciality are required.");
      return;
    }
    setSaving(true);
    try {
      await adminSaveOperation(token, form, editingId ?? undefined);
      showSuccessToast(editingId ? "Operation updated" : "Operation added");
      setForm(EMPTY);
      setEditingId(null);
      await load();
    } catch (e) {
      showErrorToast("Could not save operation", (e as Error).message);
    } finally {
      setSaving(false);
    }
  };

  const remove = async (op: SurgicalOperation) => {
    if (!token) return;
    try {
      await adminDeleteOperation(token, op.id);
      setOps((prev) => prev.filter((o) => o.id !== op.id));
      showSuccessToast("Operation deleted");
    } catch (e) {
      showErrorToast("Could not delete operation", (e as Error).message);
    }
  };

  const toggleActive = async (op: SurgicalOperation) => {
    if (!token) return;
    try {
      const saved = await adminSaveOperation(
        token,
        { name_en: op.name_en, name_ar: op.name_ar, speciality_id: op.speciality_id, is_active: !op.is_active },
        op.id,
      );
      setOps((prev) => prev.map((o) => (o.id === op.id ? { ...o, is_active: saved.is_active } : o)));
    } catch (e) {
      showErrorToast("Could not update operation", (e as Error).message);
    }
  };

  const visible = useMemo(
    () => (filter ? ops.filter((o) => o.speciality_id === filter) : ops),
    [ops, filter],
  );

  return (
    <AdminShell
      title="Surgical operations"
      subtitle="Predefined operations per speciality. Hospitals pick from this list."
    >
      <ScrollView contentContainerStyle={surgeryStyles.page}>
        <Section title={editingId ? "Edit operation" : "Add operation"}>
          <View style={surgeryStyles.row}>
            <Field
              label="Name (English)"
              value={form.name_en}
              onChangeText={(name_en) => setForm((f) => ({ ...f, name_en }))}
            />
            <Field
              label="Name (Arabic)"
              value={form.name_ar}
              onChangeText={(name_ar) => setForm((f) => ({ ...f, name_ar }))}
            />
          </View>
          <Muted>Speciality</Muted>
          <View style={surgeryStyles.row}>
            {specialities.map((s) => (
              <Chip
                key={s.id}
                label={s.name_en}
                active={form.speciality_id === s.id}
                onPress={() => setForm((f) => ({ ...f, speciality_id: s.id }))}
              />
            ))}
          </View>
          <View style={surgeryStyles.row}>
            <Chip
              label={form.is_active ? "Active" : "Inactive"}
              active={form.is_active}
              onPress={() => setForm((f) => ({ ...f, is_active: !f.is_active }))}
            />
            <View style={{ flex: 1 }} />
            {editingId ? (
              <Button
                label="Cancel"
                variant="outline"
                onPress={() => {
                  setEditingId(null);
                  setForm(EMPTY);
                }}
              />
            ) : null}
            <Button label={editingId ? "Save" : "Add"} busy={saving} onPress={() => void save()} />
          </View>
        </Section>

        <Section title={`Operations (${visible.length})`}>
          <View style={surgeryStyles.row}>
            <Chip label="All" active={!filter} onPress={() => setFilter("")} />
            {specialities.map((s) => (
              <Chip key={s.id} label={s.name_en} active={filter === s.id} onPress={() => setFilter(s.id)} />
            ))}
          </View>
          {loading ? (
            <ActivityIndicator color={colors.primary} style={{ marginVertical: 24 }} />
          ) : visible.length === 0 ? (
            <Muted>No operations yet.</Muted>
          ) : (
            visible.map((op) => (
              <View
                key={op.id}
                style={[
                  surgeryStyles.row,
                  { borderTopWidth: 1, borderTopColor: colors.border, paddingTop: 10 },
                ]}
              >
                <View style={{ flex: 1, minWidth: 180 }}>
                  <Text style={{ color: colors.foreground, fontWeight: "700", opacity: op.is_active ? 1 : 0.5 }}>
                    {op.name_en} · {op.name_ar}
                  </Text>
                  <Muted>
                    {op.speciality?.name_en ?? "—"}
                    {op.hospital_id ? ` · Custom by ${op.hospital?.name ?? "a hospital"}` : ""}
                  </Muted>
                </View>
                <Chip
                  label={op.is_active ? "Active" : "Inactive"}
                  active={op.is_active}
                  onPress={() => void toggleActive(op)}
                />
                <Button
                  label="Edit"
                  variant="outline"
                  onPress={() => {
                    setEditingId(op.id);
                    setForm({
                      name_en: op.name_en,
                      name_ar: op.name_ar,
                      speciality_id: op.speciality_id,
                      is_active: op.is_active,
                    });
                  }}
                />
                <Button label="Delete" variant="danger" onPress={() => void remove(op)} />
              </View>
            ))
          )}
        </Section>
      </ScrollView>
    </AdminShell>
  );
}
