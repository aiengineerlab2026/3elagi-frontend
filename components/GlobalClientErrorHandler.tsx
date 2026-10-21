import React, { useCallback, useEffect, useState } from "react";
import { AppErrorFallback } from "@/components/AppErrorBoundary";

type GlobalErrorState = {
  error: Error;
  retry?: () => void;
};

function toError(value: unknown): Error {
  if (value instanceof Error) return value;
  if (typeof value === "string") return new Error(value);
  return new Error("Unknown client error");
}

function isBenignNetworkError(value: unknown): boolean {
  if (!(value instanceof Error)) return false;
  const msg = value.message.toLowerCase();
  return (
    value.name === "TypeError" ||
    msg === "failed to fetch" ||
    msg.includes("network request failed") ||
    msg.includes("could not reach the server") ||
    msg.includes("load failed")
  );
}

/** Catches non-React client errors (event handlers, async work, native global handler). */
export function GlobalClientErrorHandler({ children }: { children: React.ReactNode }) {
  const [globalError, setGlobalError] = useState<GlobalErrorState | null>(null);

  const clearError = useCallback(() => {
    setGlobalError(null);
  }, []);

  useEffect(() => {
    type ErrorUtilsType = {
      getGlobalHandler?: () => (error: unknown, isFatal?: boolean) => void;
      setGlobalHandler: (handler: (error: unknown, isFatal?: boolean) => void) => void;
    };
    const ErrorUtils = (require("react-native") as { ErrorUtils?: ErrorUtilsType }).ErrorUtils;
    if (!ErrorUtils?.setGlobalHandler) return;

    const previousHandler = ErrorUtils.getGlobalHandler?.();

    ErrorUtils.setGlobalHandler((error: unknown, isFatal?: boolean) => {
      if (isBenignNetworkError(error)) {
        previousHandler?.(error, isFatal);
        return;
      }
      setGlobalError({
        error: toError(error),
        retry: clearError,
      });
      previousHandler?.(error, isFatal);
    });

    return () => {
      if (previousHandler) {
        ErrorUtils.setGlobalHandler(previousHandler);
      }
    };
  }, [clearError]);

  if (globalError) {
    return (
      <AppErrorFallback
        error={globalError.error}
        retry={globalError.retry ?? clearError}
      />
    );
  }

  return <>{children}</>;
}
