import Toast from "react-native-toast-message";

type ToastType = "success" | "error" | "info";

export function showToast(
  type: ToastType,
  title: string,
  message?: string,
): void {
  Toast.show({
    type,
    text1: title,
    text2: message,
    position: "top",
    visibilityTime: 3200,
  });
}

export function showSuccessToast(title: string, message?: string): void {
  showToast("success", title, message);
}

export function showErrorToast(title: string, message?: string): void {
  showToast("error", title, message);
}

export function showInfoToast(title: string, message?: string): void {
  showToast("info", title, message);
}
