import { LinearGradient } from "expo-linear-gradient";
import { BookOpen, CreditCard, MessageCircle, Video } from "lucide-react-native";
import React from "react";
import { ScrollView, StyleSheet, Text, View } from "react-native";
import { DocumentationVideoEmbed } from "@/components/documentation/DocumentationVideoEmbed";
import { BRAND_SCROLL_NATIVE_ID } from "@/components/web/globalWebStyles";
import {
  DOCUMENTATION_VIDEOS,
  type DocumentationVideoKey,
} from "@/constants/documentationVideos";
import { surfaceCard, UI } from "@/constants/uiTokens";
import { useColors } from "@/hooks/useColors";
import { useI18n } from "@/hooks/useI18n";
import { alignText } from "@/utils/rtl";

const SECTION_ICONS: Record<
  DocumentationVideoKey,
  typeof BookOpen
> = {
  generalIntroduction: BookOpen,
  textConsultationPayment: CreditCard,
  videoConsultation: Video,
};

type Props = {
  showAppHeader?: boolean;
  isDesktop?: boolean;
  nativeScrollId?: string;
};

export function DocumentationPageContent({
  showAppHeader: _showAppHeader,
  isDesktop = false,
  nativeScrollId,
}: Props) {
  const colors = useColors();
  const { t, isRTL } = useI18n();
  const textAlign = alignText(isRTL);
  const videoHeight = isDesktop ? 520 : 280;

  return (
    <ScrollView
      nativeID={nativeScrollId}
      contentContainerStyle={[styles.scroll, isDesktop && styles.scrollDesktop]}
      showsVerticalScrollIndicator
    >
      <LinearGradient
        colors={[`${colors.primary}22`, `${colors.primary}06`, colors.background]}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
        style={[styles.hero, { borderColor: `${colors.primary}33` }]}
      >
        <View style={[styles.heroBadge, { backgroundColor: `${colors.primary}18` }]}>
          <MessageCircle size={18} color={colors.primary} />
          <Text style={[styles.heroBadgeText, { color: colors.primary }]}>
            {t.documentation.heroBadge}
          </Text>
        </View>
        <Text style={[styles.heroTitle, { color: colors.foreground, textAlign }]}>
          {t.documentation.title}
        </Text>
        <Text style={[styles.heroSubtitle, { color: colors.mutedForeground, textAlign }]}>
          {t.documentation.subtitle}
        </Text>
      </LinearGradient>

      {DOCUMENTATION_VIDEOS.map((video, index) => {
        const Icon = SECTION_ICONS[video.key];
        const note =
          video.noteKey && t.documentation[video.noteKey]
            ? String(t.documentation[video.noteKey])
            : null;
        return (
          <View
            key={video.key}
            style={[
              styles.section,
              surfaceCard(colors.card, colors.border),
              { borderColor: colors.border },
            ]}
          >
            <View style={[styles.sectionHead, { flexDirection: isRTL ? "row-reverse" : "row" }]}>
              <View style={[styles.iconWrap, { backgroundColor: `${colors.primary}14` }]}>
                <Icon size={20} color={colors.primary} />
              </View>
              <View style={{ flex: 1 }}>
                <Text style={[styles.sectionIndex, { color: colors.mutedForeground, textAlign }]}>
                  {String(index + 1).padStart(2, "0")}
                </Text>
                <Text style={[styles.sectionTitle, { color: colors.foreground, textAlign }]}>
                  {t.documentation[video.key]}
                </Text>
              </View>
            </View>

            {note ? (
              <View
                style={[
                  styles.note,
                  {
                    backgroundColor: `${colors.primary}10`,
                    borderColor: `${colors.primary}33`,
                  },
                ]}
              >
                <Text style={[styles.noteText, { color: colors.foreground, textAlign }]}>
                  {note}
                </Text>
              </View>
            ) : null}

            <DocumentationVideoEmbed
              youtubeId={video.youtubeId}
              title={t.documentation[video.key]}
              height={videoHeight}
            />
          </View>
        );
      })}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  scroll: {
    paddingHorizontal: 16,
    paddingTop: 12,
    paddingBottom: 48,
    gap: 18,
  },
  scrollDesktop: {
    paddingTop: 24,
    maxWidth: 960,
    width: "100%",
    alignSelf: "center",
  },
  hero: {
    borderRadius: UI.radius.card,
    borderWidth: StyleSheet.hairlineWidth,
    padding: 20,
    gap: 10,
    marginBottom: 4,
  },
  heroBadge: {
    alignSelf: "flex-start",
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 999,
  },
  heroBadgeText: {
    fontSize: 12,
    fontWeight: "700",
    letterSpacing: 0.2,
  },
  heroTitle: {
    fontSize: 26,
    fontWeight: "800",
    letterSpacing: -0.5,
    lineHeight: 32,
  },
  heroSubtitle: {
    fontSize: 15,
    lineHeight: 22,
  },
  section: {
    padding: 16,
    gap: 14,
    borderRadius: UI.radius.card,
  },
  sectionHead: {
    alignItems: "center",
    gap: 12,
  },
  iconWrap: {
    width: 44,
    height: 44,
    borderRadius: 12,
    alignItems: "center",
    justifyContent: "center",
  },
  sectionIndex: {
    fontSize: 11,
    fontWeight: "700",
    letterSpacing: 1,
    textTransform: "uppercase",
    marginBottom: 2,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: "800",
    letterSpacing: -0.2,
    lineHeight: 24,
  },
  note: {
    borderWidth: StyleSheet.hairlineWidth,
    borderRadius: 12,
    paddingHorizontal: 14,
    paddingVertical: 12,
  },
  noteText: {
    fontSize: 14,
    lineHeight: 21,
    fontWeight: "600",
  },
});
