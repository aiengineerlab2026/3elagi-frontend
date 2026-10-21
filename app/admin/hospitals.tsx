import React, { useCallback, useEffect, useState } from "react";
import { ActivityIndicator, ScrollView, Text, View } from "react-native";
import { AdminShell } from "@/components/admin/AdminShell";
import { Button, Chip, Field, Muted, Section, StatusBadge, surgeryStyles } from "@/components/surgery/ui";
import { useAuthStore } from "@/domains/auth/store";
import {
  adminDeleteHospital,
  adminFetchHospitals,
  adminSaveHospital,
  type ApprovalStatus,
  type Hospital,
} from "@/domains/surgery/api";
import { useColors } from "@/hooks/useColors";
import { showErrorToast, showSuccessToast } from "@/utils/toast";

const EMPTY = { name: "", email: "", location: "", description: "", phone: "", is_active: true };

export default function AdminHospitals() {
  const colors = useColors();
  const token = useAuthStore((s) => s.accessToken);
  const [rows, setRows] = useState<Hospital[]>([]);
  const [loading, setLoading] = useState(true);
  const [form, setForm] = useState(EMPTY);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  const load = useCallback(async () => {
    if (!token) return;
    setLoading(true);
    try {
      setRows(await adminFetchHospitals(token));
    } catch (e) {
      showErrorToast("Failed to load hospitals", (e as Error).message);
    } finally {
      setLoading(false);
    }
  }, [token]);

  useEffect(() => {
    void load();
  }, [load]);

  const reset = () => {
    setEditingId(null);
    setForm(EMPTY);
  };

  const save = async () => {
    if (!token) return;
    if (!form.name.trim()) {
      showErrorToast("Name is required");
      return;
    }
    setSaving(true);
    try {
      const { email, ...fields } = form;
      const saved = await adminSaveHospital(
        token,
        editingId ? fields : { ...fields, email: email.trim() || undefined },
        editingId ?? undefined,
      );
      showSuccessToast(
        editingId ? "Hospital updated" : "Hospital added",
        saved.default_password
          ? `Login: ${saved.owner?.email} / ${saved.default_password}`
          : undefined,
      );
      reset();
      await load();
    } catch (e) {
      showErrorToast("Could not save hospital", (e as Error).message);
    } finally {
      setSaving(false);
    }
  };

  const setApproval = async (h: Hospital, approval_status: ApprovalStatus) => {
    if (!token) return;
    try {
      const saved = await adminSaveHospital(token, { approval_status }, h.id);
      setRows((prev) => prev.map((r) => (r.id === h.id ? saved : r)));
      showSuccessToast(`Hospital ${approval_status}`, h.owner_id ? "The hospital was notified." : undefined);
    } catch (e) {
      showErrorToast("Could not update hospital", (e as Error).message);
    }
  };

  const remove = async (h: Hospital) => {
    if (!token) return;
    try {
      await adminDeleteHospital(token, h.id);
      setRows((prev) => prev.filter((r) => r.id !== h.id));
      if (editingId === h.id) reset();
      showSuccessToast("Hospital deleted");
    } catch (e) {
      showErrorToast("Could not delete hospital", (e as Error).message);
    }
  };

  return (
    <AdminShell
      title="Hospitals"
      subtitle="Approve hospital sign-ups and manage hospitals shown to patients."
    >
      <ScrollView contentContainerStyle={surgeryStyles.page}>
        <Section title={editingId ? "Edit hospital" : "Add hospital"}>
          <View style={surgeryStyles.row}>
            <Field label="Name" value={form.name} onChangeText={(name) => setForm((f) => ({ ...f, name }))} />
            <Field label="Phone" value={form.phone} onChangeText={(phone) => setForm((f) => ({ ...f, phone }))} />
          </View>
          {!editingId ? (
            <>
              <Field
                label="Email (login account)"
                value={form.email}
                autoCapitalize="none"
                keyboardType="email-address"
                onChangeText={(email) => setForm((f) => ({ ...f, email }))}
              />
              <Muted>An account is created with the default password Aa123456. Leave empty for a listing without a login.</Muted>
            </>
          ) : null}
          <Field
            label="Location"
            value={form.location}
            onChangeText={(location) => setForm((f) => ({ ...f, location }))}
          />
          <Field
            label="Description"
            multiline
            value={form.description}
            onChangeText={(description) => setForm((f) => ({ ...f, description }))}
          />
          <View style={surgeryStyles.row}>
            <Chip
              label={form.is_active ? "Visible to patients" : "Hidden"}
              active={form.is_active}
              onPress={() => setForm((f) => ({ ...f, is_active: !f.is_active }))}
            />
            <View style={{ flex: 1 }} />
            {editingId ? <Button label="Cancel" variant="outline" onPress={reset} /> : null}
            <Button label={editingId ? "Save" : "Add"} busy={saving} onPress={() => void save()} />
          </View>
        </Section>

        <Section title={`Hospitals (${rows.length})`}>
          {loading ? (
            <ActivityIndicator color={colors.primary} style={{ marginVertical: 24 }} />
          ) : rows.length === 0 ? (
            <Muted>No hospitals yet.</Muted>
          ) : (
            rows.map((h) => (
              <View
                key={h.id}
                style={[surgeryStyles.row, { borderTopWidth: 1, borderTopColor: colors.border, paddingTop: 10 }]}
              >
                <View style={{ flex: 1, minWidth: 200, gap: 2 }}>
                  <Text style={{ color: colors.foreground, fontWeight: "700", opacity: h.is_active ? 1 : 0.5 }}>
                    {h.name}
                    {h.owner_id ? "" : "  (no account)"}
                  </Text>
                  {h.owner?.email ? <Muted>{h.owner.email}</Muted> : null}
                  <Muted>{[h.location, h.phone].filter(Boolean).join(" · ") || "—"}</Muted>
                  {h.description ? <Muted>{h.description}</Muted> : null}
                </View>
                {h.approval_status ? (
                  <StatusBadge status={h.approval_status} label={h.approval_status} />
                ) : null}
                {h.approval_status !== "approved" ? (
                  <Button label="Approve" onPress={() => void setApproval(h, "approved")} />
                ) : null}
                {h.approval_status === "pending" ? (
                  <Button label="Reject" variant="danger" onPress={() => void setApproval(h, "rejected")} />
                ) : null}
                <Button
                  label="Edit"
                  variant="outline"
                  onPress={() => {
                    setEditingId(h.id);
                    setForm({
                      name: h.name,
                      email: "",
                      location: h.location,
                      description: h.description,
                      phone: h.phone,
                      is_active: h.is_active !== false,
                    });
                  }}
                />
                <Button label="Delete" variant="danger" onPress={() => void remove(h)} />
              </View>
            ))
          )}
        </Section>
      </ScrollView>
    </AdminShell>
  );
}
