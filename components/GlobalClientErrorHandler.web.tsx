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

/** Handled in feature code (toast); don't replace the whole app with an error screen. */
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

/** Catches window errors and unhandled promise rejections outside the React tree. */
export function GlobalClientErrorHandler({ children }: { children: React.ReactNode }) {
  const [globalError, setGlobalError] = useState<GlobalErrorState | null>(null);

  const clearError = useCallback(() => {
    setGlobalError(null);
  }, []);

  useEffect(() => {
    const onError = (event: ErrorEvent) => {
      if (isBenignNetworkError(event.error ?? event.message)) {
        event.preventDefault();
        return;
      }
      setGlobalError({
        error: toError(event.error ?? event.message),
        retry: () => {
          clearError();
          window.location.reload();
        },
      });
    };

    const onUnhandledRejection = (event: PromiseRejectionEvent) => {
      if (isBenignNetworkError(event.reason)) {
        event.preventDefault();
        return;
      }
      setGlobalError({
        error: toError(event.reason),
        retry: () => {
          clearError();
          window.location.reload();
        },
      });
    };

    window.addEventListener("error", onError);
    window.addEventListener("unhandledrejection", onUnhandledRejection);

    return () => {
      window.removeEventListener("error", onError);
      window.removeEventListener("unhandledrejection", onUnhandledRejection);
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
