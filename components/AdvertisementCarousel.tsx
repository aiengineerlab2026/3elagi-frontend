import React, { useEffect, useRef, useState } from "react";
import {
  Dimensions,
  FlatList,
  Image,
  NativeScrollEvent,
  NativeSyntheticEvent,
  Pressable,
  StyleSheet,
  Text,
  View,
} from "react-native";
import type { Advertisement } from "@/domains/home/api";
import { localizeAdvertisement } from "@/domains/home/localizeAdvertisement";
import { useColors } from "@/hooks/useColors";
import { useI18n } from "@/hooks/useI18n";

const { width: SCREEN_WIDTH } = Dimensions.get("window");
const CARD_WIDTH = SCREEN_WIDTH - 32;
const IMAGE_HEIGHT = 160;

interface Props {
  items: Advertisement[];
  isRTL: boolean;
}

export function AdvertisementCarousel({ items, isRTL }: Props) {
  const colors = useColors();
  const { locale } = useI18n();
  const listRef = useRef<FlatList<Advertisement>>(null);
  const [activeIndex, setActiveIndex] = useState(0);
  const isArabic = locale === "ar";

  useEffect(() => {
    if (items.length <= 1) return;
    const timer = setInterval(() => {
      setActiveIndex((prev) => {
        const next = (prev + 1) % items.length;
        listRef.current?.scrollToIndex({ index: next, animated: true });
        return next;
      });
    }, 5000);
    return () => clearInterval(timer);
  }, [items.length]);

  if (items.length === 0) return null;

  const onScroll = (e: NativeSyntheticEvent<NativeScrollEvent>) => {
    const idx = Math.round(e.nativeEvent.contentOffset.x / (CARD_WIDTH + 12));
    if (idx >= 0 && idx < items.length) setActiveIndex(idx);
  };

  return (
    <View style={styles.wrap}>
      <FlatList
        ref={listRef}
        data={items}
        horizontal
        pagingEnabled
        snapToInterval={CARD_WIDTH + 12}
        decelerationRate="fast"
        inverted={isRTL}
        showsHorizontalScrollIndicator={false}
        keyExtractor={(item) => item.id}
        onScroll={onScroll}
        scrollEventThrottle={16}
        getItemLayout={(_, index) => ({
          length: CARD_WIDTH + 12,
          offset: (CARD_WIDTH + 12) * index,
          index,
        })}
        contentContainerStyle={{ paddingHorizontal: 16, gap: 12 }}
        renderItem={({ item }) => {
          const copy = localizeAdvertisement(item, locale);
          return (
            <View style={[styles.slide, { width: CARD_WIDTH }]}>
              <Pressable
                style={[
                  styles.imageCard,
                  { borderColor: colors.border, backgroundColor: colors.muted },
                ]}
              >
                <Image
                  source={{ uri: item.bannerImageUrl }}
                  style={styles.banner}
                  resizeMode="stretch"
                  accessibilityLabel={copy.title}
                />
              </Pressable>
              <View
                style={[
                  styles.caption,
                  { direction: isArabic ? "rtl" : "ltr" } as object,
                ]}
                // @ts-expect-error web writing direction
                dir={isArabic ? "rtl" : "ltr"}
              >
                <Text
                  style={[
                    styles.title,
                    {
                      color: colors.foreground,
                      textAlign: isArabic ? "right" : "left",
                      writingDirection: isArabic ? "rtl" : "ltr",
                      fontSize: isArabic ? 18 : 16,
                      lineHeight: isArabic ? 24 : 21,
                    },
                  ]}
                  numberOfLines={2}
                >
                  {copy.title}
                </Text>
                <Text
                  style={[
                    styles.desc,
                    {
                      color: colors.mutedForeground,
                      textAlign: isArabic ? "right" : "left",
                      writingDirection: isArabic ? "rtl" : "ltr",
                      fontSize: isArabic ? 14 : 13,
                      lineHeight: isArabic ? 20 : 18,
                    },
                  ]}
                  numberOfLines={3}
                >
                  {copy.description}
                </Text>
              </View>
            </View>
          );
        }}
      />
      {items.length > 1 ? (
        <View style={styles.dots}>
          {items.map((item, i) => (
            <View
              key={item.id}
              style={[
                styles.dot,
                {
                  backgroundColor:
                    i === activeIndex ? colors.primary : colors.border,
                },
              ]}
            />
          ))}
        </View>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { paddingTop: 12, paddingBottom: 4 },
  slide: {
    gap: 10,
  },
  imageCard: {
    height: IMAGE_HEIGHT,
    borderRadius: 16,
    overflow: "hidden",
    borderWidth: StyleSheet.hairlineWidth,
  },
  banner: {
    width: "100%",
    height: "100%",
  },
  caption: {
    gap: 4,
    paddingHorizontal: 2,
  },
  title: {
    fontWeight: "800",
  },
  desc: {
    fontWeight: "600",
  },
  dots: {
    flexDirection: "row",
    justifyContent: "center",
    gap: 6,
    marginTop: 10,
  },
  dot: { width: 7, height: 7, borderRadius: 4 },
});
