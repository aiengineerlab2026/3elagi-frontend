import { Asset } from "expo-asset";
import { Image } from "expo-image";
import React, { useEffect, useState } from "react";
import { View, StyleSheet } from "react-native";
import Svg, { Circle } from "react-native-svg";
import type { PaymentMethodId } from "@/components/points/PaymentMethodCard";

const LOGO_HEIGHT = 48;

type LogoConfig = {
  source: number;
  aspect: number;
  backgroundColor: string;
  label: string;
};

const PAYMENT_LOGOS: Record<PaymentMethodId, LogoConfig> = {
  credit_card: {
    source: require("../../assets/images/payments/credit-card.png"),
    aspect: 860 / 914,
    backgroundColor: "#ffffff",
    label: "Credit card",
  },
};

function CreditCardSvgFallback() {
  return (
    <Svg width={44} height={LOGO_HEIGHT} viewBox="0 0 44 48">
      <Circle cx="16" cy="24" r="12" fill="#EB001B" opacity={0.9} />
      <Circle cx="28" cy="24" r="12" fill="#F79E1B" opacity={0.9} />
    </Svg>
  );
}

async function resolveBundledImageUri(moduleId: number): Promise<string> {
  const asset = Asset.fromModule(moduleId);
  if (!asset.downloaded) {
    await asset.downloadAsync();
  }
  const uri = asset.localUri ?? asset.uri;
  if (!uri) {
    throw new Error("Bundled payment logo URI missing");
  }
  return uri;
}

function PaymentLogoImage({ id }: { id: PaymentMethodId }) {
  const logo = PAYMENT_LOGOS[id];
  const [uri, setUri] = useState<string | null>(null);
  const [failed, setFailed] = useState(false);
  const height = LOGO_HEIGHT;
  const width = Math.max(40, Math.round(height * logo.aspect));

  useEffect(() => {
    let cancelled = false;
    void resolveBundledImageUri(logo.source)
      .then((resolvedUri) => {
        if (!cancelled) setUri(resolvedUri);
      })
      .catch(() => {
        if (!cancelled) setFailed(true);
      });
    return () => {
      cancelled = true;
    };
  }, [logo.source]);

  if (failed) {
    return <CreditCardSvgFallback />;
  }

  return (
    <View
      style={[
        styles.frame,
        {
          width,
          height,
          backgroundColor: logo.backgroundColor,
        },
      ]}
    >
      {uri ? (
        <Image
          source={{ uri }}
          style={{ width, height }}
          contentFit="contain"
          accessibilityLabel={logo.label}
          onError={() => setFailed(true)}
        />
      ) : null}
    </View>
  );
}

export function PaymentProviderLogo({ id }: { id: PaymentMethodId }) {
  return (
    <View style={styles.slot}>
      <PaymentLogoImage id={id} />
    </View>
  );
}

const styles = StyleSheet.create({
  slot: {
    flexShrink: 0,
    alignItems: "center",
    justifyContent: "center",
  },
  frame: {
    borderRadius: 12,
    alignItems: "center",
    justifyContent: "center",
  },
});
