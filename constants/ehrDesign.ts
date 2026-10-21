/** EHR / clinical UI tokens — telemedicine master-detail surfaces. */
export const EHR = {
  text: {
    primary: "#0F172A",
    section: "#334155",
    body: "#475569",
    secondary: "#64748B",
  },
  brand: "#2563EB",
  brandDark: "#1D4ED8",
  brandSoft: "#EFF6FF",
  brandSoftHover: "#DBEAFE",
  bg: {
    app: "#F8FAFC",
    card: "#FFFFFF",
  },
  border: "#E2E8F0",
  radius: {
    control: 8,
    card: 12,
  },
  masterPaneWidth: 380,
  workspaceGap: 24,
  headerPadding: { vertical: 20, horizontal: 24 },
  documentCardPadding: 28,
  type: {
    title: { fontSize: 22, fontWeight: "700" as const, color: "#0F172A" },
    section: { fontSize: 15, fontWeight: "600" as const, color: "#334155" },
    body: { fontSize: 14, fontWeight: "400" as const, color: "#475569", lineHeight: 22 },
    meta: { fontSize: 12, fontWeight: "500" as const, color: "#64748B" },
  },
  shadow: {
    card: { boxShadow: "0 1px 3px rgba(0,0,0,0.05)" },
  },
} as const;
