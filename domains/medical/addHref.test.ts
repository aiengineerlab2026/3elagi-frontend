import { beforeEach, describe, expect, it } from "vitest";
import { useAiPreferenceStore } from "@/domains/ai/aiPreference";
import { buildMedicalAddEntryHref } from "@/domains/medical/addHref";

describe("buildMedicalAddEntryHref", () => {
  beforeEach(() => {
    useAiPreferenceStore.setState({ aiEnabled: true });
  });

  it("sends patients straight to the AI form — never the manual/AI question", () => {
    expect(buildMedicalAddEntryHref({ isPatient: true })).toBe("/medical/add-ai");
  });

  it("sends patients to the manual form when AI is switched off", () => {
    useAiPreferenceStore.setState({ aiEnabled: false });
    expect(buildMedicalAddEntryHref({ isPatient: true })).toBe("/medical/add");
  });

  it("keeps doctors on the manual form whatever the switch says", () => {
    expect(buildMedicalAddEntryHref({ isPatient: false })).toBe("/medical/add");
    useAiPreferenceStore.setState({ aiEnabled: false });
    expect(buildMedicalAddEntryHref({ isPatient: false })).toBe("/medical/add");
  });
});
