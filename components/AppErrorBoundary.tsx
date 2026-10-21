import type { ErrorBoundaryProps } from "expo-router";
import React, { useEffect } from "react";
import {
  Image,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

const SPLASH_LOGO = require("@/assets/images/splash-logo.png");

const FALLBACK_COLORS = {
  background: "#f5f7fa",
  foreground: "#1a2132",
  mutedForeground: "#5c6b82",
  primary: "#0f766e",
  primaryForeground: "#ffffff",
  border: "#dde4ef",
  destructive: "#dc4c4c",
  codeBackground: "#eef2f8",
} as const;

function normalizeError(error: unknown): Error {
  if (error instanceof Error) return error;
  if (typeof error === "string") return new Error(error);
  try {
    return new Error(JSON.stringify(error));
  } catch {
    return new Error(String(error));
  }
}

function formatStack(error: Error): string {
  if (error.stack?.trim()) return error.stack.trim();
  return `${error.name}: ${error.message}`;
}

/** Self-contained crash screen — no theme/i18n hooks so it still renders when providers fail. */
export function AppErrorFallback({
  error,
  retry,
}: {
  error: unknown;
  retry?: () => void | Promise<void>;
}) {
  const normalized = normalizeError(error);
  const stack = formatStack(normalized);

  useEffect(() => {
    console.error("[AppErrorBoundary]", normalized);
  }, [normalized]);

  return (
    <SafeAreaView style={styles.safeArea}>
      <View style={styles.container} testID="app_error_boundary">
        <Image
          source={SPLASH_LOGO}
          style={styles.logo}
          accessibilityLabel="3elagi"
          resizeMode="contain"
        />

        <Text style={styles.title} accessibilityRole="header">
          Something went wrong
        </Text>
        <Text style={styles.subtitle}>
          The app hit an unexpected error. You can try again, or share the details below with
          support if the problem continues.
        </Text>

        <View style={styles.messageCard}>
          <Text style={styles.messageLabel}>Error</Text>
          <Text style={styles.messageText} selectable testID="app_error_message">
            {normalized.message || "Unknown error"}
          </Text>
          {normalized.name && normalized.name !== "Error" ? (
            <Text style={styles.errorType} selectable>
              Type: {normalized.name}
            </Text>
          ) : null}
        </View>

        <View style={styles.stackCard}>
          <Text style={styles.messageLabel}>Call stack</Text>
          {Platform.OS === "web" ? (
            <ScrollView
              style={styles.stackScroll}
              contentContainerStyle={styles.stackScrollContent}
              nestedScrollEnabled
            >
              <Text style={styles.stackText} selectable testID="app_error_stack">
                {stack}
              </Text>
            </ScrollView>
          ) : (
            <TextInputLikeStack value={stack} />
          )}
          {Platform.OS === "web" && process.env.NODE_ENV === "production" ? (
            <Text style={styles.sourceMapHint}>
              Source maps are enabled for production builds — open DevTools for mapped file
              names and line numbers.
            </Text>
          ) : null}
        </View>

        {retry ? (
          <Pressable
            accessibilityRole="button"
            testID="app_error_retry"
            onPress={() => void retry()}
            style={({ pressed, ...rest }) => {
              const hovered = Platform.OS === "web" ? (rest as { hovered?: boolean }).hovered : false;
              return [styles.retryButton, (pressed || hovered) && styles.retryButtonPressed];
            }}
          >
            <Text style={styles.retryButtonText}>Try again</Text>
          </Pressable>
        ) : null}
      </View>
    </SafeAreaView>
  );
}

function TextInputLikeStack({ value }: { value: string }) {
  return (
    <TextInput
      testID="app_error_stack"
      value={value}
      editable={false}
      multiline
      scrollEnabled
      selectTextOnFocus
      style={styles.stackInput}
    />
  );
}

/** Expo Router root error boundary — catches render errors in the route tree. */
export function ErrorBoundary({ error, retry }: ErrorBoundaryProps) {
  return <AppErrorFallback error={error} retry={retry} />;
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: FALLBACK_COLORS.background,
  },
  container: {
    flex: 1,
    paddingHorizontal: 24,
    paddingVertical: 32,
    alignItems: "center",
    justifyContent: "center",
    gap: 16,
    maxWidth: 720,
    width: "100%",
    alignSelf: "center",
  },
  logo: {
    width: 180,
    height: 72,
    marginBottom: 8,
  },
  title: {
    fontSize: Platform.select({ web: 28, default: 24 }),
    fontWeight: "800",
    color: FALLBACK_COLORS.foreground,
    textAlign: "center",
  },
  subtitle: {
    fontSize: 15,
    lineHeight: 22,
    color: FALLBACK_COLORS.mutedForeground,
    textAlign: "center",
    maxWidth: 520,
  },
  messageCard: {
    width: "100%",
    gap: 8,
    padding: 16,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: FALLBACK_COLORS.border,
    backgroundColor: "#ffffff",
  },
  stackCard: {
    width: "100%",
    flex: 1,
    maxHeight: Platform.select({ web: 280, default: 220 }),
    gap: 8,
    padding: 16,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: FALLBACK_COLORS.border,
    backgroundColor: "#ffffff",
  },
  messageLabel: {
    fontSize: 12,
    fontWeight: "700",
    letterSpacing: 0.6,
    textTransform: "uppercase",
    color: FALLBACK_COLORS.mutedForeground,
  },
  messageText: {
    fontSize: 16,
    lineHeight: 22,
    color: FALLBACK_COLORS.destructive,
    fontWeight: "600",
  },
  errorType: {
    fontSize: 13,
    color: FALLBACK_COLORS.mutedForeground,
    fontFamily: Platform.select({
      web: "ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace",
      ios: "Menlo",
      default: "monospace",
    }),
  },
  stackScroll: {
    flex: 1,
    borderRadius: 12,
    backgroundColor: FALLBACK_COLORS.codeBackground,
  },
  stackScrollContent: {
    padding: 12,
  },
  stackText: {
    fontSize: 12,
    lineHeight: 18,
    color: FALLBACK_COLORS.foreground,
    fontFamily: Platform.select({
      web: "ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace",
      ios: "Menlo",
      default: "monospace",
    }),
  },
  stackInput: {
    flex: 1,
    minHeight: 120,
    padding: 12,
    borderRadius: 12,
    backgroundColor: FALLBACK_COLORS.codeBackground,
    color: FALLBACK_COLORS.foreground,
    fontSize: 12,
    lineHeight: 18,
    fontFamily: Platform.select({
      ios: "Menlo",
      default: "monospace",
    }),
    textAlignVertical: "top",
  },
  sourceMapHint: {
    fontSize: 12,
    lineHeight: 18,
    color: FALLBACK_COLORS.mutedForeground,
  },
  retryButton: {
    marginTop: 4,
    minWidth: 160,
    paddingVertical: 14,
    paddingHorizontal: 28,
    borderRadius: 999,
    backgroundColor: FALLBACK_COLORS.primary,
    alignItems: "center",
    justifyContent: "center",
    ...Platform.select({
      web: {
        cursor: "pointer",
        transitionDuration: "120ms",
      } as object,
    }),
  },
  retryButtonPressed: {
    opacity: 0.88,
  },
  retryButtonText: {
    fontSize: 16,
    fontWeight: "700",
    color: FALLBACK_COLORS.primaryForeground,
  },
});
