import { Linking } from "react-native";
import { ANDROID_APP_URL } from "@/constants/mobileApp";

export function openAndroidAppDownload(): void {
  void Linking.openURL(ANDROID_APP_URL);
}
