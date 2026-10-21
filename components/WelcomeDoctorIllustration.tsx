import { Image } from "expo-image";
import React, { useState } from "react";
import { StyleSheet, useWindowDimensions, View } from "react-native";

interface Props {
  rtl?: boolean;
}

/**
 * Clinic hero illustration — fills the gap between logo and login buttons.
 */
export function WelcomeDoctorIllustration({ rtl: _rtl = false }: Props) {
  const { width: screenWidth } = useWindowDimensions();
  const maxWidth = Math.min(screenWidth - 24, 440);
  const [layout, setLayout] = useState({ width: 0, height: 0 });

  const ready = layout.width > 0 && layout.height > 0;
  const heroWidth = ready ? Math.min(layout.width, maxWidth) : maxWidth;

  return (
    <View
      style={styles.fill}
      onLayout={(e) => {
        const { width, height } = e.nativeEvent.layout;
        setLayout({ width, height });
      }}
    >
      {ready ? (
        <View
          style={[
            styles.hero,
            { width: heroWidth, height: layout.height },
          ]}
        >
          <Image
            source={require("@/assets/images/welcome-clinic-hero.jpg")}
            style={styles.image}
            contentFit="contain"
            accessibilityLabel="Doctor in clinic with medical records"
          />
        </View>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  fill: {
    flex: 1,
    width: "100%",
    minHeight: 0,
    alignItems: "center",
    justifyContent: "center",
  },
  hero: {
    alignItems: "center",
    justifyContent: "center",
  },
  image: {
    width: "100%",
    height: "100%",
  },
});
