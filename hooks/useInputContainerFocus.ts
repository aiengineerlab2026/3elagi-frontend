import { useCallback, useState } from "react";
import { useColors } from "@/hooks/useColors";

/** Focus ring for inputs whose border is on a wrapping View (e.g. EgpPriceInput). */
export function useInputContainerFocus(error?: boolean) {
  const colors = useColors();
  const [focused, setFocused] = useState(false);

  const borderColor =
    error === true
      ? colors.destructive
      : focused
        ? colors.primary
        : colors.border;

  const onFocus = useCallback(() => setFocused(true), []);
  const onBlur = useCallback(() => setFocused(false), []);

  return { borderColor, onFocus, onBlur, focused };
}
