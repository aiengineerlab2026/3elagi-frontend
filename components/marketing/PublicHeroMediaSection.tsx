import React from "react";
import { StyleSheet, View } from "react-native";
import { TvFramedVideo } from "@/components/marketing/TvFramedVideo";

/** Mobile / tablet showcase — sits below hero copy + trust, before role choice. */
export function PublicHeroMediaSection() {
  return (
    <View style={styles.wrap}>
      <TvFramedVideo />
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: {
    marginHorizontal: 16,
    marginTop: 8,
    marginBottom: 24,
  },
});
