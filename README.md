# tungcodeforfun.github.io

Personal site for Tung Nguyen, Senior Software Engineer in New York: one screen, two koi drawn in
text symbols, a name and four links.

- `src/koi/` is the whole drawing, plain TypeScript with no DOM:
  - `koi.ts` is one fish: a spine of 30 links that follows the head, a travelling wave that grows
    toward the tail, and a painter that fills the silhouette cell by cell. Outline cells get a
    glyph from the outline's direction and where it crosses the cell (`_ . - ' ( ) / \`), the body
    gets scale arcs that face the tail (`( ) ‿ ⌒`), fins and tail get rays.
  - `pond.ts` is the two fish, their loose orbit, steering (each other, the edges, the text block,
    taps), the drifting water specks and ripples. `paint()` returns a `Grid` of glyphs and inks.
  - `grid.ts` is that glyph grid; `math.ts` small helpers.
- `src/client/main.ts` draws the grid on a `<canvas>` every frame (`fillText` per cell), reads the
  ink colours from CSS custom properties, slows to a third under `prefers-reduced-motion`, and stops
  while the tab is hidden.
- `src/render.ts` runs at build time (the `prerender` plugin in `vite.config.ts`): head tags, the
  page, and two frames of the same pond as `<pre>` text (wide and narrow) for visitors without JS.
- Inks and the page colours are in `src/styles/site.css`, light and dark via
  `prefers-color-scheme`. Name, role and links are in `src/content.ts`.
- `public/resume.pdf` is the résumé; replace the file to update it.
- Fonts: Source Serif 4 for the text, a DejaVu Sans Mono subset for the koi (see
  `THIRD_PARTY_NOTICES.md`).

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
npx vite preview --port 4185
CHROME_PATH=/path/to/chrome npm run e2e -- --url http://localhost:4185/
CHROME_PATH=/path/to/chrome npm run tour -- --url http://localhost:4185/ --out <dir>
```

`npm run e2e` runs axe in both themes at phone and desktop sizes, fails on console errors,
overflow or any koi pixel under the text block, checks every link, then lets the koi swim for 60 s
with clicks and pointer moves and fails on any console message. `npm run tour` saves the screenshot
matrix (1440 and 390, both themes, motion and reduced motion), tap and no-JS shots, a 15 s
`koi.webm`, and rAF frame times. Pick parts with `--only shots,tap,nojs,video,frames`.

`CHROME_PATH=… npm run assets` re-renders `public/og.png` from the running site (1200×630, dark)
and the favicons from `public/favicon.svg`.

## Deploy

Pushes to `main` build and publish to GitHub Pages via `.github/workflows/deploy.yml`.
