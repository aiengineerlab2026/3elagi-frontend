import { Alert, Platform } from "react-native";

/** Cross-platform confirm — window.confirm on web, Alert on native. */
export function confirmAction(message: string): Promise<boolean> {
  if (Platform.OS === "web" && typeof window !== "undefined" && window.confirm) {
    return Promise.resolve(window.confirm(message));
  }

  return new Promise((resolve) => {
    Alert.alert("Confirm", message, [
      { text: "Cancel", style: "cancel", onPress: () => resolve(false) },
      { text: "OK", style: "destructive", onPress: () => resolve(true) },
    ]);
  });
}
