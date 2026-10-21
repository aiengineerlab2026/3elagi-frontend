import { AppState, type AppStateStatus, InteractionManager } from "react-native";

/**
 * Central foreground-resume manager.
 *
 * Instead of every feature attaching its own `AppState.addEventListener` and
 * doing heavy work synchronously on the resume frame (which freezes the UI),
 * register a task here. Tasks run:
 *   - only on a real background/inactive -> active transition,
 *   - skipping brief flaps (permission dialogs, share sheets, control center),
 *   - after interactions settle, so the first frame stays responsive,
 *   - with the total duration logged for profiling.
 */

type ResumeTask = () => void;

const tasks = new Set<ResumeTask>();
let started = false;
let appState: AppStateStatus = AppState.currentState;
let backgroundedAt: number | null = null;

// Resumes after a background shorter than this are treated as flaps and skip
// the heavy resync (e.g. a permission dialog briefly backgrounding the app).
const MIN_BACKGROUND_MS = 1500;

function log(...args: unknown[]): void {
  if (__DEV__) console.log("[resume]", ...args);
}

function handleChange(next: AppStateStatus): void {
  const prev = appState;
  appState = next;

  if (next === "inactive" || next === "background") {
    if (prev === "active") backgroundedAt = Date.now();
    return;
  }

  // next === "active"
  if (prev === "active") return; // active -> active flap, no real resume

  const awayMs = backgroundedAt ? Date.now() - backgroundedAt : 0;
  backgroundedAt = null;

  if (awayMs > 0 && awayMs < MIN_BACKGROUND_MS) {
    log(`skip resync (away ${awayMs}ms < ${MIN_BACKGROUND_MS}ms)`);
    return;
  }

  if (tasks.size === 0) return;

  const startedAt = Date.now();
  log(`resume (away ${awayMs}ms): scheduling ${tasks.size} task(s)`);
  // Defer past the resume frame so the UI is interactive immediately.
  InteractionManager.runAfterInteractions(() => {
    for (const task of [...tasks]) {
      try {
        task();
      } catch (e) {
        log("task error", e);
      }
    }
    log(`tasks completed ${Date.now() - startedAt}ms after resume`);
  });
}

/** Starts the single AppState listener. Idempotent. */
export function startAppResumeManager(): void {
  if (started) return;
  started = true;
  AppState.addEventListener("change", handleChange);
  log("manager started");
}

/** Run `task` on each real foreground resume (deferred + profiled). */
export function onAppResume(task: ResumeTask): () => void {
  startAppResumeManager();
  tasks.add(task);
  return () => {
    tasks.delete(task);
  };
}
