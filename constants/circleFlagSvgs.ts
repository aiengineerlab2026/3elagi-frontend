/**
 * Pre-circularized country flag SVGs (HatScripts circle-flags style).
 * Mask ids are unique per country so multiple flags can render on one screen.
 */
export const CIRCLE_FLAG_SVGS: Record<string, string> = {
  EG: `<svg xmlns="http://www.w3.org/2000/svg" width="512" height="512" viewBox="0 0 512 512"><mask id="eg-flag-mask"><circle cx="256" cy="256" r="256" fill="#fff"/></mask><g mask="url(#eg-flag-mask)"><path fill="#eee" d="m0 144 256-32 256 32v224l-256 32L0 368Z"/><path fill="#d80027" d="M0 0h512v144H0Z"/><path fill="#333" d="M0 368h512v144H0Z"/><path fill="#ff9811" d="M250 191c-8 0-17 4-22 14 5-3 16-1 16 13 0 4-2 8-5 10-8 0-14-14-29-14-10 0-19 7-19 17v69l46-7-14 27h66l-14-27 46 7v-69c0-10-9-17-19-17-15 0-21 14-29 14 8-23-7-37-23-37z"/></g></svg>`,
  JO: `<svg xmlns="http://www.w3.org/2000/svg" width="512" height="512" viewBox="0 0 512 512"><mask id="jo-flag-mask"><circle cx="256" cy="256" r="256" fill="#fff"/></mask><g mask="url(#jo-flag-mask)"><path fill="#eee" d="m126 158 127.8-10.3L512 167v178l-254.9 32.3L126 335.9z"/><path fill="#333" d="M0 0h512v167H107z"/><path fill="#6da544" d="M107 345h405v167H0z"/><path fill="#d80027" d="M0 0v512l256-256z"/><path fill="#eee" d="m101.6 200.3 14 29.4 31.8-7.3-14.2 29.3 25.5 20.2-31.8 7.2.1 32.6-25.4-20.4-25.4 20.4V279l-31.7-7.2 25.5-20-14.2-29.4 31.8 7.3z"/></g></svg>`,
};
