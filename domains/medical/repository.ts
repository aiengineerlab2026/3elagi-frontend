import type { MedicalRecord } from "./types";

const intakeSeed = (ownerId: string): MedicalRecord[] => {
  const now = new Date();
  const iso = (offsetDays: number) => {
    const d = new Date(now);
    d.setDate(d.getDate() - offsetDays);
    return d.toISOString();
  };
  return [
    {
      id: "r6",
      ownerId,
      category: "intake",
      title: "Smoking history",
      value: "Non-smoker",
      date: iso(0),
      createdAt: iso(0),
    },
    {
      id: "r7",
      ownerId,
      category: "intake",
      title: "Allergies",
      value: "Penicillin",
      date: iso(0),
      createdAt: iso(0),
    },
  ];
};

let store: Record<string, MedicalRecord[]> = {};

function sortByDate(records: MedicalRecord[]): MedicalRecord[] {
  return [...records].sort((a, b) =>
    a.date < b.date ? 1 : a.date > b.date ? -1 : 0,
  );
}

export const medicalRepository = {
  listIntake(ownerId: string): MedicalRecord[] {
    if (!store[ownerId]) store[ownerId] = intakeSeed(ownerId);
    return sortByDate(store[ownerId].filter((r) => r.category === "intake"));
  },
  add(record: Omit<MedicalRecord, "id" | "createdAt">): MedicalRecord {
    const full: MedicalRecord = {
      ...record,
      id: `r-${Date.now()}`,
      createdAt: new Date().toISOString(),
    };
    store[record.ownerId] = [full, ...(store[record.ownerId] || [])];
    return full;
  },
  remove(ownerId: string, id: string) {
    store[ownerId] = (store[ownerId] || []).filter((r) => r.id !== id);
  },
};
