/** Shared nativeID for branded scrollbars on web ScrollViews / overflow panels. */
export const BRAND_SCROLL_NATIVE_ID = "brand-scroll";

export const GLOBAL_WEB_CSS = `
html, body, #root {
  height: 100%;
  width: 100%;
}

body {
  margin: 0;
  overflow: hidden;
  background: var(--app-bg, #f5f7fa);
  color: var(--app-fg, #1a2132);
  color-scheme: light dark;
  -webkit-font-smoothing: antialiased;
  -moz-osx-font-smoothing: grayscale;
}

/*
 * Arabic typography — Cairo (loaded in +html.tsx). Keyed off [lang="ar"], not
 * [dir="rtl"]: the document stays dir="ltr" on purpose (see LocaleBootstrap).
 * RN Web writes no font-family of its own, so this cascades to every Text.
 */
html[lang="ar"],
html[lang="ar"] body,
html[lang="ar"] input,
html[lang="ar"] textarea,
html[lang="ar"] button,
html[lang="ar"] select {
  font-family: "Cairo", "Segoe UI", system-ui, -apple-system, sans-serif;
}

/*
 * Latin tracking is set per-component (headlines run down to -0.6px) and it
 * pulls Arabic glyphs out of their joins, so drop it whenever Arabic renders.
 */
html[lang="ar"] * {
  letter-spacing: normal !important;
}

html[lang="ar"] body {
  line-height: 1.7;
}

@media (max-width: 1023px) {
  body {
    overflow: auto;
  }
}

#root {
  display: flex;
  flex-direction: column;
}

input, textarea {
  outline: none;
  box-shadow: none;
}

input:focus,
input:focus-visible,
textarea:focus,
textarea:focus-visible {
  outline: none;
  box-shadow: none;
}

/*
 * Chromium ignores ::-webkit-scrollbar-* when scrollbar-color is set (including via inheritance).
 * Keep scrollbar-color for Firefox only; use webkit rules for Chrome/Safari/Edge.
 */
@supports (-moz-appearance: none) {
  * {
    scrollbar-width: thin !important;
    scrollbar-color: var(--scrollbar-thumb, #3057f2) var(--scrollbar-track, rgba(48, 87, 242, 0.1)) !important;
  }
}

/* Branded scrollbars on every overflow container (incl. RN Web ScrollView). */
*::-webkit-scrollbar {
  width: 8px !important;
  height: 8px !important;
  background: transparent !important;
  -webkit-appearance: none !important;
}

*::-webkit-scrollbar-thumb {
  background-color: var(--scrollbar-thumb, #3057f2) !important;
  border-radius: 999px !important;
  border: 2px solid transparent !important;
  background-clip: padding-box !important;
}

*::-webkit-scrollbar-thumb:hover {
  background-color: var(--scrollbar-thumb-hover, #2546c4) !important;
}

*::-webkit-scrollbar-track {
  background: var(--scrollbar-track, rgba(48, 87, 242, 0.1)) !important;
}

#auth-form-scroll,
#brand-scroll {
  overflow-y: auto;
  overscroll-behavior: contain;
}

/*
 * Arabic: the scrollbar belongs on the leading (left) edge. Only the scroll
 * containers flip; children are reset to ltr so the hand-rolled RTL layout
 * (explicit flexDirection / textAlign) renders exactly as before.
 */
html[lang="ar"] #auth-form-scroll,
html[lang="ar"] #brand-scroll {
  direction: rtl;
}

html[lang="ar"] #auth-form-scroll > *,
html[lang="ar"] #brand-scroll > * {
  direction: ltr;
}

@media (min-width: 1024px) {
  [data-testid="points-balance-card"]:hover,
  [data-testid="points-chart-card"]:hover,
  [data-testid="points-stat-card"]:hover,
  [data-testid="points-add-card"]:hover {
    box-shadow: 0 12px 32px rgba(15, 23, 42, 0.08);
    transform: translateY(-1px);
  }

  [data-testid="points-quick-chip"]:hover {
    border-color: #0f766e !important;
    background: rgba(15, 118, 110, 0.08) !important;
  }

  [data-testid="points-add-btn"]:hover {
    filter: brightness(1.05);
  }

  [data-testid="records-row"]:hover {
    box-shadow: 0 8px 24px rgba(15, 23, 42, 0.07);
  }

  [data-testid="medical-record-info-card"]:hover,
  [data-testid="medical-record-linked-row"]:hover,
  [data-testid="medical-record-image"]:hover {
    box-shadow: 0 8px 24px rgba(15, 23, 42, 0.07);
  }

  [data-testid="medical-record-delete"]:hover,
  [data-testid="medical-record-delete-bottom"]:hover {
    background: #fee2e2 !important;
    border-color: #fca5a5 !important;
  }

  [data-testid="medical-record-back"]:hover {
    opacity: 0.85;
  }

  [data-testid="points-balance-card"],
  [data-testid="points-chart-card"],
  [data-testid="points-stat-card"],
  [data-testid="points-add-card"],
  [data-testid="points-quick-chip"],
  [data-testid="points-add-btn"],
  [data-testid="records-row"],
  [data-testid="medical-record-info-card"],
  [data-testid="medical-record-linked-row"],
  [data-testid="medical-record-image"],
  [data-testid="medical-record-delete"],
  [data-testid="medical-record-delete-bottom"],
  [data-testid="medical-record-back"] {
    transition: box-shadow 160ms ease, transform 160ms ease, border-color 160ms ease,
      background-color 160ms ease, filter 160ms ease, opacity 160ms ease;
  }
}
`;
