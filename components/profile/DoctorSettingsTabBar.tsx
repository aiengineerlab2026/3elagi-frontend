import React from "react";
import { Pressable, ScrollView, StyleSheet, Text, View } from "react-native";
import {
  DOCTOR_SETTINGS_TABS,
  type DoctorSettingsTabId,
} from "@/components/profile/doctorSettingsTypes";
import { PROFILE_SETTINGS } from "@/constants/profileSettingsDesign";
import { useColors } from "@/hooks/useColors";

type Props = {
  activeTab: DoctorSettingsTabId;
  onTabChange: (tab: DoctorSettingsTabId) => void;
  isRTL: boolean;
};

export function DoctorSettingsTabBar({ activeTab, onTabChange, isRTL }: Props) {
  const colors = useColors();

  return (
    <View
      style={[
        styles.wrap,
        { backgroundColor: PROFILE_SETTINGS.bg.app },
      ]}
    >
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={[
          styles.scroll,
          { flexDirection: isRTL ? "row-reverse" : "row" },
        ]}
      >
        {DOCTOR_SETTINGS_TABS.map((tab) => {
          const on = activeTab === tab.id;
          const label = isRTL ? tab.labelAr : tab.labelEn;
          return (
            <Pressable
              key={tab.id}
              onPress={() => onTabChange(tab.id)}
              style={[
                styles.tab,
                {
                  backgroundColor: on ? `${PROFILE_SETTINGS.brand}12` : PROFILE_SETTINGS.bg.card,
                  borderColor: on ? PROFILE_SETTINGS.brand : PROFILE_SETTINGS.border,
                },
              ]}
              accessibilityRole="tab"
              accessibilityState={{ selected: on }}
            >
              <Text style={styles.tabIcon}>{tab.icon}</Text>
              <Text
                style={{
                  color: on ? PROFILE_SETTINGS.brand : colors.foreground,
                  fontWeight: on ? "800" : "600",
                  fontSize: 13,
                }}
                numberOfLines={1}
              >
                {label}
              </Text>
            </Pressable>
          );
        })}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: {
    paddingVertical: 8,
  },
  scroll: {
    gap: 8,
    paddingHorizontal: 2,
  },
  tab: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderRadius: PROFILE_SETTINGS.radius.card,
    borderWidth: 1,
  },
  tabIcon: {
    fontSize: 15,
  },
});
