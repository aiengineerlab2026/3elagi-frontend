import React from "react";
import { StyleSheet, View } from "react-native";
import { AppHeader } from "@/components/AppHeader";
import { MarketDoctorsBrowse } from "@/components/MarketDoctorsBrowse";
import { AppSidebarDrawer } from "@/components/nav/AppSidebarDrawer";
import { DEFAULT_PATIENT_COUNTRY } from "@/constants/patientCountries";
import { AppSidebarProvider } from "@/contexts/AppSidebarContext";
import { getDomainMarketCountry } from "@/domains/market/resolveMarketCountry";
import { useColors } from "@/hooks/useColors";

/** Doctor directory: specialities → roster (with country filter) → profile.
 *  Where "Find a doctor" / "Book a consultation" land instead of scrolling home. */
export default function DoctorsDirectoryScreen() {
  const colors = useColors();
  const domainMarket = getDomainMarketCountry();

  return (
    // Provider + drawer: this route sits outside (tabs), so the header's menu
    // button would otherwise open nothing.
    <AppSidebarProvider>
      <View style={[styles.root, { backgroundColor: colors.background }]}>
        <AppHeader />
        <MarketDoctorsBrowse
          marketCountry={domainMarket ?? DEFAULT_PATIENT_COUNTRY}
          showMarketBanner={!!domainMarket}
        />
        <AppSidebarDrawer />
      </View>
    </AppSidebarProvider>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1 },
});
