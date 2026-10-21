import { Alert, Platform } from "react-native";
import { showErrorToast } from "@/utils/toast";

/** Cross-platform alert — uses toast on web where Alert.alert is unreliable. */
export function showAppAlert(title: string, message?: string): void {
  if (Platform.OS === "web") {
    showErrorToast(title, message);
    return;
  }
  Alert.alert(title, message ?? "");
}
