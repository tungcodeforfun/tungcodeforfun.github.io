# tungcodeforfun.github.io

Personal site for Tung Nguyen, Senior Software Engineer in New York.

A static page rendered at build time from React components (`src/render.tsx`, wired in by the
`prerender` plugin in `vite.config.ts`). The browser gets plain HTML, CSS and under 1 KB of
JavaScript (`src/client/main.ts`) for the theme toggle, the motion toggle, and pausing figures that
are off screen or in a hidden tab. Each figure's own pause control is a checkbox styled with CSS, so
it works without JavaScript.

- All copy and facts live in `src/content.ts`. In case-study text, `{key|words}` colours those
  words to match the part of the figure they name (keys are styled in `src/styles/layout.css`).
- Each figure is an SVG component in `src/figures/`. Moving parts use CSS `offset-path`
  keyframes generated at build time by `src/figures/motion.ts`.
- `public/resume.pdf` is the résumé linked from the page; replace the file to update it.
- The font is a subset of Source Serif 4 (see `THIRD_PARTY_NOTICES.md`).

## Develop

```bash
npm install
npm run dev
```

## Check

```bash
npm run lint
npm run typecheck
npm test
npm run build
CHROME_PATH=/path/to/chrome npm run e2e -- --url http://localhost:4173/
```

`npm run e2e` runs axe in both themes at phone and desktop sizes, fails on console errors or
horizontal overflow, and checks every link. Add `--shots <dir>` to save the screenshot set.

`CHROME_PATH=/path/to/chrome npm run assets` re-renders `public/og.png` from `scripts/og.html` and
the favicons from `public/favicon.svg`.

## Deploy

Pushes to `main` build and publish to GitHub Pages via `.github/workflows/deploy.yml`.
