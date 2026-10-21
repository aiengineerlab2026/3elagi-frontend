import React from "react";
import { BodyPartAutocomplete } from "@/components/records/BodyPartAutocomplete";
import type { BodyPart } from "@/domains/medical/bodyParts";

interface Props {
  value?: BodyPart | null;
  onChange: (part: BodyPart) => void;
  label?: string;
}

/** Add-record body part field — autocomplete dropdown, defaults to All / general. */
export function BodyPartPicker({ value, onChange, label }: Props) {
  return (
    <BodyPartAutocomplete
      value={value ?? "general"}
      onChange={(part) => onChange(part ?? "general")}
      label={label}
      clearable={false}
    />
  );
}
