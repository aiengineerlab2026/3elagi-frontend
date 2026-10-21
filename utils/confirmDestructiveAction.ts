import { Alert, Platform } from "react-native";
import { webConfirm } from "@/utils/webConfirm";

type Options = {
  title: string;
  message: string;
  confirmLabel: string;
  cancelLabel: string;
  onConfirm: () => void | Promise<void>;
};

/** RN Web's Alert.alert often ignores action buttons — use window.confirm on web. */
export function confirmDestructiveAction(options: Options): void {
  if (Platform.OS === "web") {
    if (webConfirm(options.title, options.message)) {
      void options.onConfirm();
    }
    return;
  }

  Alert.alert(options.title, options.message, [
    { text: options.cancelLabel, style: "cancel" },
    {
      text: options.confirmLabel,
      style: "destructive",
      onPress: () => {
        void options.onConfirm();
      },
    },
  ]);
}
