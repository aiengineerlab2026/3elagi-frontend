import { useFocusEffect } from "@react-navigation/native";
import { Redirect, router } from "expo-router";
import { Search } from "lucide-react-native";
import React, { useCallback, useMemo, useState } from "react";
import {
  StyleSheet,
  TextInput,
  View,
} from "react-native";
import { AppTextInput } from "@/components/AppTextInput";

import { AppHeader } from "@/components/AppHeader";
import { ChatHistoryList } from "@/components/ChatHistoryList";
import { useAuthStore } from "@/domains/auth/store";
import { isSignedIn } from "@/domains/auth/session";
import { canUseChat } from "@/domains/chat/access";
import { useChatStore } from "@/domains/chat/store";
import { ensureDoctorOnboarding } from "@/domains/onboarding/doctorTourApi";
import { useProductTourStore, currentTourStep } from "@/domains/onboarding/productTourStore";
import { useColors } from "@/hooks/useColors";
import { useI18n } from "@/hooks/useI18n";

import type { Conversation } from "@/domains/chat/types";

const DEMO_PATIENT_LABEL = "demo patient";

/** Doctors should only ever see one specialty demo patient in chat history. */
function dedupeDemoPatientConversations(
  rows: Conversation[],
  allowedDemoUserId: string | null,
): Conversation[] {
  let keptDemo = false;
  return rows.filter((row) => {
    const isDemo =
      row.user.name.trim().toLowerCase() === DEMO_PATIENT_LABEL ||
      row.user.name.trim().toLowerCase().includes(DEMO_PATIENT_LABEL);
    if (!isDemo) return true;
    if (allowedDemoUserId && row.user.id !== allowedDemoUserId) return false;
    if (keptDemo) return false;
    keptDemo = true;
    return true;
  });
}

export default function HistoryTab() {
  const colors = useColors();
  const { t, isRTL } = useI18n();
  const profile = useAuthStore((s) => s.profile);
  const accessToken = useAuthStore((s) => s.accessToken);
  const role = useAuthStore((s) => s.role);
  const conversations = useChatStore((s) => s.conversations);
  const loading = useChatStore((s) => s.loading);
  const error = useChatStore((s) => s.error);
  const loadConversations = useChatStore((s) => s.loadConversations);
  const setTestPatientUserId = useProductTourStore((s) => s.setTestPatientUserId);
  const tourHighlightUserId = useProductTourStore((s) => s.testPatientUserId);
  const tourActive = useProductTourStore((s) => s.active);
  const tourPhase = useProductTourStore((s) => s.phase);
  const tourStepIndex = useProductTourStore((s) => s.stepIndex);
  const tourStep = currentTourStep(tourPhase, tourStepIndex);
  const [query, setQuery] = useState("");
  const isDoctor = role?.toLowerCase() === "doctor";

  const refresh = useCallback(async () => {
    if (!accessToken || !profile?.id || !canUseChat(role)) return;
    if (role?.toLowerCase() === "doctor") {
      const demoId = await ensureDoctorOnboarding(accessToken).catch(() => null);
      if (demoId) setTestPatientUserId(demoId);
    }
    await loadConversations(accessToken, profile.id, role);
  }, [accessToken, profile?.id, role, loadConversations, setTestPatientUserId]);

  useFocusEffect(
    useCallback(() => {
      refresh();
    }, [refresh]),
  );

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    let list = q
      ? conversations.filter((c) => c.user.name.toLowerCase().includes(q))
      : conversations;
    if (isDoctor) {
      list = dedupeDemoPatientConversations(list, tourHighlightUserId);
    }
    if (
      tourHighlightUserId &&
      tourActive &&
      tourStep?.anchor === "chat-test-row"
    ) {
      list = [...list].sort((a, b) => {
        if (a.user.id === tourHighlightUserId) return -1;
        if (b.user.id === tourHighlightUserId) return 1;
        return 0;
      });
    }
    return list;
  }, [conversations, query, tourHighlightUserId, tourActive, tourStep?.anchor, isDoctor]);

  const dir = isRTL ? "row-reverse" : "row";
  const emptyLabel = isDoctor
    ? isRTL
      ? "لا توجد محادثات بعد"
      : "No conversations yet"
    : isRTL
      ? "لا توجد محادثات بعد"
      : "No conversations yet";

  if (!isSignedIn(profile, accessToken) || !role) {
    return <Redirect href="/welcome" />;
  }

  return (
    <View style={[styles.root, { backgroundColor: colors.background }]}>
      <AppHeader>
        <View
          style={[
            styles.searchBar,
            {
              backgroundColor: colors.card,
              borderColor: colors.border,
              flexDirection: dir,
            },
          ]}
        >
          <Search size={16} color={colors.mutedForeground} />
          <AppTextInput
            value={query}
            onChangeText={setQuery}
            placeholder={t.common.search}
            placeholderTextColor={colors.mutedForeground}
            style={[
              styles.searchInput,
              { color: colors.foreground, textAlign: isRTL ? "right" : "left" },
            ]}
          />
        </View>
      </AppHeader>

      <ChatHistoryList
        conversations={filtered}
        loading={loading}
        error={error}
        isRTL={isRTL}
        onSelect={(id) => router.push(`/chat/${id}`)}
        emptyLabel={emptyLabel}
        tourHighlightUserId={tourHighlightUserId}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1 },
  searchBar: {
    alignItems: "center",
    gap: 8,
    paddingHorizontal: 12,
    paddingVertical: 10,
    borderRadius: 14,
    borderWidth: 1,
  },
  searchInput: { flex: 1, fontSize: 14, padding: 0 },
});
