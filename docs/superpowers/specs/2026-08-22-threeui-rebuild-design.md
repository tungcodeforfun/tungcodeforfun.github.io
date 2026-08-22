# Portfolio rebuild around a live shader background

Date: 2026-08-22

## Goal
Replace the macOS-desktop portfolio with a single-page, editorial portfolio whose
atmosphere comes from one live WebGL background (ThreeUI's RibbonField, vendored).
Content is sourced from the GitHub profile README and the current site.

## Stack
- Vite 7, React 19, TypeScript, plain CSS with custom properties. No router, no Tailwind.
- Background: `src/background/RibbonField.tsx` + `ribbonFieldShaders.ts`, vendored from
  MengTo/threeui (MIT, notice retained). Adapted: color uniforms, window-level pointer,
  `prefers-reduced-motion` renders one frame, `webglcontextlost` + `visibilitychange` handled.
- `BackgroundBoundary` error boundary falls back to a static CSS gradient.
- Deploy: unchanged GitHub Pages workflow (build -> dist).

## Structure
```
src/main.tsx, App.tsx, content.ts
src/background/{RibbonField.tsx, ribbonFieldShaders.ts, BackgroundBoundary.tsx}
src/sections/{Hero,Work,Experience,Projects,Contact}.tsx
src/styles/{tokens,base,layout}.css
```

## Content
- Hero: name, positioning line from README, CTAs (email, GitHub), LinkedIn in nav.
- What I work on: four README bullets as cards.
- Experience: two EY roles (Senior SWE Dec 2024-present, SWE Aug 2022-Dec 2024), bullets
  from current site, "3,000+ retail locations" aligned to "3,500 stores".
- Projects: tcg-price-tracker, streeteasy-monitor, descriptions from their READMEs.
- Contact: email, GitHub, LinkedIn, New York, NY.

## Visual system
Near-black base, shader owns the color; single cyan accent from the shader palette.
Display: Instrument Serif. Body: IBM Plex Sans. Labels/tags: IBM Plex Mono.
Background dims via `--bg-dim` as the hero scrolls out. Max content width ~1040px,
hairline rules between sections, no boxed panels.

## Responsive, a11y, perf
Single column under 720px, DPR cap 1.5 on small screens. Landmarks, skip link, focus
rings, reduced motion. Targets: Lighthouse 95+ across the board, JS under 80 KB gz.

## Verification
tsc + eslint + vite build; Vitest + Testing Library for content shape, error boundary
fallback, reduced-motion branch. Playwright screenshots at 1440 and 390 wide.
