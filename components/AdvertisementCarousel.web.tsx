import { LinearGradient } from "expo-linear-gradient";
import { ChevronLeft, ChevronRight } from "lucide-react-native";
import React, { useCallback, useEffect, useRef, useState } from "react";
import {
  Animated,
  Image,
  Pressable,
  StyleSheet,
  Text,
  useWindowDimensions,
  View,
} from "react-native";
import type { Advertisement } from "@/domains/home/api";
import { localizeAdvertisement } from "@/domains/home/localizeAdvertisement";
import { useColors } from "@/hooks/useColors";
import { useI18n } from "@/hooks/useI18n";
import { useWebLayout } from "@/hooks/useWebLayout";

interface Props {
  items: Advertisement[];
  isRTL: boolean;
}

export function AdvertisementCarousel({ items, isRTL }: Props) {
  const colors = useColors();
  const { locale } = useI18n();
  const { width } = useWindowDimensions();
  const { isDesktop, isTablet } = useWebLayout();
  const [activeIndex, setActiveIndex] = useState(0);
  const fade = useRef(new Animated.Value(1)).current;

  /** Overlay copy on image only on desktop; mobile/tablet show caption under image. */
  const textUnderImage = !isDesktop;

  const horizontalPadding = isDesktop ? 24 : 16;
  const bannerWidth = Math.max(280, width - horizontalPadding * 2);
  const bannerHeight = isDesktop
    ? Math.round(Math.min(320, Math.max(220, bannerWidth * 0.26)))
    : isTablet
      ? 200
      : 168;
  const isArabic = locale === "ar";
  const titleSize = isDesktop
    ? isArabic
      ? 32
      : 28
    : isArabic
      ? 20
      : 17;
  const descSize = isDesktop
    ? isArabic
      ? 18
      : 16
    : isArabic
      ? 15
      : 13;

  const goTo = useCallback(
    (index: number) => {
      if (index < 0 || index >= items.length || index === activeIndex) return;

      Animated.timing(fade, {
        toValue: 0,
        duration: 140,
        useNativeDriver: true,
      }).start(({ finished }) => {
        if (!finished) return;
        setActiveIndex(index);
        Animated.timing(fade, {
          toValue: 1,
          duration: 180,
          useNativeDriver: true,
        }).start();
      });
    },
    [activeIndex, fade, items.length],
  );

  const goNext = useCallback(() => {
    goTo((activeIndex + 1) % items.length);
  }, [activeIndex, goTo, items.length]);

  const goPrev = useCallback(() => {
    goTo((activeIndex - 1 + items.length) % items.length);
  }, [activeIndex, goTo, items.length]);

  useEffect(() => {
    if (items.length <= 1) return;
    const timer = setInterval(goNext, 6000);
    return () => clearInterval(timer);
  }, [goNext, items.length]);

  if (items.length === 0) return null;

  const item = items[activeIndex];
  const copy = localizeAdvertisement(item, locale);
  const showControls = items.length > 1;
  const PrevIcon = isRTL ? ChevronRight : ChevronLeft;
  const NextIcon = isRTL ? ChevronLeft : ChevronRight;

  const caption = (
    <View
      style={[
        textUnderImage ? styles.captionBelow : styles.copyBlock,
        {
          width: textUnderImage
            ? "100%"
            : isDesktop
              ? isArabic
                ? "38%"
                : "70%"
              : "88%",
          maxWidth: !textUnderImage && isArabic ? 360 : undefined,
          direction: isArabic ? "rtl" : "ltr",
        } as object,
      ]}
      // @ts-expect-error web writing direction
      dir={isArabic ? "rtl" : "ltr"}
    >
      <Text
        style={[
          styles.title,
          textUnderImage && { color: colors.foreground, textShadowRadius: 0 },
          {
            fontSize: titleSize,
            lineHeight: titleSize + (isArabic ? 8 : 6),
            textAlign: isArabic ? "right" : "left",
            writingDirection: isArabic ? "rtl" : "ltr",
            width: "100%",
          },
        ]}
        numberOfLines={2}
      >
        {copy.title}
      </Text>
      <Text
        style={[
          styles.desc,
          textUnderImage && {
            color: colors.mutedForeground,
            textShadowRadius: 0,
          },
          {
            fontSize: descSize,
            lineHeight: descSize + (isArabic ? 8 : 6),
            textAlign: isArabic ? "right" : "left",
            writingDirection: isArabic ? "rtl" : "ltr",
            width: "100%",
          },
        ]}
        numberOfLines={textUnderImage ? 3 : 2}
      >
        {copy.description}
      </Text>
    </View>
  );

  return (
    <View style={[styles.wrap, { paddingHorizontal: horizontalPadding }]}>
      <View
        style={[
          styles.hero,
          {
            height: bannerHeight,
            borderColor: colors.border,
            backgroundColor: colors.muted,
          },
        ]}
      >
        <Animated.View style={[styles.slide, { opacity: fade }]}>
          <Image
            source={{ uri: item.bannerImageUrl }}
            style={styles.banner}
            resizeMode="stretch"
            accessibilityLabel={copy.title}
          />
          {!textUnderImage ? (
            <>
              <LinearGradient
                colors={["rgba(15,39,68,0.74)", "rgba(15,39,68,0.2)", "rgba(15,39,68,0.5)"]}
                locations={[0, 0.42, 1]}
                start={{ x: 0, y: 0.5 }}
                end={{ x: 1, y: 0.5 }}
                style={StyleSheet.absoluteFillObject}
              />
              <View
                style={[
                  styles.copyOverlay,
                  {
                    alignItems: "flex-start",
                    paddingLeft: isArabic ? 20 : 28,
                    paddingRight: 28,
                    paddingVertical: 24,
                  },
                ]}
              >
                {caption}
              </View>
            </>
          ) : null}
        </Animated.View>
      </View>

      {textUnderImage ? (
        <Animated.View style={{ opacity: fade, marginTop: 10 }}>
          {caption}
        </Animated.View>
      ) : null}

      {showControls ? (
        <View style={[styles.footer, { flexDirection: isRTL ? "row-reverse" : "row" }]}>
          <Pressable
            onPress={goPrev}
            accessibilityLabel="Previous slide"
            style={({ pressed, hovered }: { pressed: boolean; hovered?: boolean }) => [
              styles.arrowBtn,
              {
                backgroundColor:
                  pressed || hovered ? `${colors.primary}22` : colors.card,
                borderColor: colors.border,
              },
            ]}
          >
            <PrevIcon size={18} color={colors.foreground} />
          </Pressable>

          <View style={[styles.dots, { flexDirection: isRTL ? "row-reverse" : "row" }]}>
            {items.map((ad, i) => {
              const active = i === activeIndex;
              return (
                <Pressable
                  key={ad.id}
                  onPress={() => goTo(i)}
                  accessibilityLabel={`Go to slide ${i + 1}`}
                  style={[
                    styles.dot,
                    {
                      width: active ? 22 : 8,
                      backgroundColor: active ? colors.primary : colors.border,
                    },
                  ]}
                />
              );
            })}
          </View>

          <Text style={[styles.counter, { color: colors.mutedForeground }]}>
            {activeIndex + 1}/{items.length}
          </Text>

          <Pressable
            onPress={goNext}
            accessibilityLabel="Next slide"
            style={({ pressed, hovered }: { pressed: boolean; hovered?: boolean }) => [
              styles.arrowBtn,
              {
                backgroundColor:
                  pressed || hovered ? `${colors.primary}22` : colors.card,
                borderColor: colors.border,
              },
            ]}
          >
            <NextIcon size={18} color={colors.foreground} />
          </Pressable>
        </View>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: {
    paddingTop: 12,
    paddingBottom: 8,
  },
  hero: {
    width: "100%",
    borderRadius: 18,
    overflow: "hidden",
    borderWidth: 1,
    position: "relative",
  },
  slide: {
    ...StyleSheet.absoluteFillObject,
  },
  banner: {
    ...StyleSheet.absoluteFillObject,
    width: "100%",
    height: "100%",
  },
  copyOverlay: {
    ...StyleSheet.absoluteFillObject,
    justifyContent: "center",
    zIndex: 1,
  },
  copyBlock: {
    gap: 6,
  },
  captionBelow: {
    gap: 4,
    width: "100%",
  },
  title: {
    color: "#fff",
    fontWeight: "800",
    textShadowColor: "rgba(0,0,0,0.35)",
    textShadowOffset: { width: 0, height: 1 },
    textShadowRadius: 6,
  },
  desc: {
    color: "rgba(255,255,255,0.92)",
    fontWeight: "600",
    textShadowColor: "rgba(0,0,0,0.3)",
    textShadowOffset: { width: 0, height: 1 },
    textShadowRadius: 4,
  },
  footer: {
    alignItems: "center",
    justifyContent: "space-between",
    marginTop: 12,
    gap: 10,
  },
  arrowBtn: {
    width: 36,
    height: 36,
    borderRadius: 18,
    borderWidth: 1,
    alignItems: "center",
    justifyContent: "center",
    cursor: "pointer" as "auto",
  },
  dots: {
    alignItems: "center",
    gap: 6,
    flex: 1,
    justifyContent: "center",
  },
  dot: {
    height: 8,
    borderRadius: 999,
  },
  counter: {
    fontSize: 12,
    fontWeight: "700",
    minWidth: 36,
    textAlign: "center",
  },
});
