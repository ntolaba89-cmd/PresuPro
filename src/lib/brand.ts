// @polsia:user-owned — brand identity. Edit freely. `site.ts` re-exports
// siteName/siteDescription; `manifest.ts` + `opengraph-image.tsx` read `brandVisual`.

export const siteName = 'PresuPro';
export const siteDescription = 'Presupuestos profesionales listos para enviar en minutos.';

// PWA + social-share colors. HEX only (the oklch() tokens in globals.css aren't
// readable here) — set to match your brand seed.
export const brandVisual = {
  /** PWA browser-UI / status-bar color. */
  themeColor: '#c15d35',
  /** PWA splash + install background. */
  backgroundColor: '#f7f1e8',
  /** Social-share (OG/Twitter) image. */
  og: {
    background: '#261d19',
    foreground: '#fff8ef',
    /** Second line under the site name; '' hides it. */
    tagline: 'Presupuestos profesionales listos para enviar en minutos.',
  },
} as const;
