# tungcodeforfun.github.io

Personal site for Tung Nguyen, Senior Software Engineer in New York.

A static page rendered at build time from React components (`src/render.tsx`, wired in by the
`prerender` plugin in `vite.config.ts`). The browser gets plain HTML and CSS plus a 3 KB gzipped
script (`src/client/main.ts`) for the theme and motion toggles, the topbar and scroll progress. The
heavy parts load later, each in its own chunk:

- **Hero scene** (`src/client/hero/`): three.js 0.186.1, pinned, loaded after first paint and an
  idle callback. If WebGL2 is missing, or the browser renders WebGL in software (SwiftShader,
  llvmpipe), the failure is remembered and the pre-rendered still stays. Add `?software-gl` to the
  URL to run the scene on a software renderer anyway (the e2e scripts do, since CI has no GPU).
  The loop stops when the hero is off screen, the tab is hidden, or motion is paused and the camera
  has settled.
- **Simulations** (`src/client/sim/`): one Canvas 2D chunk per case study, loaded when its figure
  comes within 600px of the viewport. `stage.ts` is the shared kernel (sizing, controls, the
  `aria-live` readout, the inspect cursor); `queue.ts`, `menu.ts`, `cache.ts` and `match.ts` are the
  simulations.
- **Stills** (`public/stills/`): a webp for the hero and each simulation per theme and width. They
  are the poster while JS loads, the no-JS and print view, and the WebGL fallback.

Notes:

- Facts and prose live in `src/content.ts`. In case-study text, `{key|words}` colours those
  words to match the part of the simulation they name (keys are styled in `src/styles/layout.css`).
  Section headings and short UI labels are in `src/sections/`, the labels drawn on the simulation
  canvases are in `src/client/sim/`, and the OG card text is in `scripts/og.html`.
- `public/resume.pdf` is the résumé linked from the page; replace the file to update it.
- Fonts are subsets of Mona Sans and Source Serif 4 (see `THIRD_PARTY_NOTICES.md`).

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
CHROME_PATH=/path/to/chrome npm run tour -- --url http://localhost:4173/ --out <dir>
```

`npm run e2e` runs axe in both themes at phone and desktop sizes, fails on console errors or
horizontal overflow, and checks every link. `npm run tour` saves the screenshot matrix (1440 and
390, both themes, motion on and reduced), operates every simulation and screenshots it mid-run,
records hero and simulation videos, probes hero frame times, and checks the WebGL fallback. Pick
parts with `--only shots,sims,video,frames,fallback`.

Assets (run against `npm run dev` or `vite preview`):

- `CHROME_PATH=… npm run assets` re-renders `public/og.png` from `scripts/og.html` and the favicons
  from `public/favicon.svg`.
- `CHROME_PATH=… npm run assets -- --stills http://localhost:5173/` re-renders every still in
  `public/stills/` from the live scenes (`?still` mode).

## Deploy

Pushes to `main` build and publish to GitHub Pages via `.github/workflows/deploy.yml`.
