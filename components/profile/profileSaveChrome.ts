/** Save button min height used in profile editors. */
export const PROFILE_SAVE_BTN_HEIGHT = 46;
/** Vertical padding around the docked save chrome (top + bottom, excluding safe area). */
export const PROFILE_SAVE_CHROME_PAD = 28;
/** Gap between Save and Log out when both are docked. */
export const PROFILE_SAVE_LOGOUT_GAP = 10;
/** Extra padding below Log out above the system safe-area inset. */
export const PROFILE_SAVE_DOCK_PAD = 16;

/** Content height of the docked profile save bar (no safe-area). */
export function profileSaveChromeHeight(options?: {
  withLogout?: boolean;
}): number {
  const withLogout = options?.withLogout ?? false;
  return (
    PROFILE_SAVE_CHROME_PAD +
    PROFILE_SAVE_BTN_HEIGHT +
    (withLogout ? PROFILE_SAVE_LOGOUT_GAP + PROFILE_SAVE_BTN_HEIGHT : 0)
  );
}

/** Bottom padding for the docked save/logout bar (safe-area + comfort pad). */
export function profileSaveDockBottomPad(safeAreaBottom: number): number {
  return PROFILE_SAVE_DOCK_PAD + Math.max(safeAreaBottom, 0);
}
