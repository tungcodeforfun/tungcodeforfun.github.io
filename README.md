# tungcodeforfun.github.io

Personal site for Tung Nguyen, Senior Software Engineer in New York City.

Single-page React 19 + Vite + TypeScript site. The live pieces are WebGL shaders from
[ThreeUI](https://github.com/MengTo/threeui), vendored under `src/background/`: RibbonField
(wallpaper), StreamConvergence and BellField (project cards), and LiquidForm (contact). They
share one runtime (`shaderLoop.ts`) that handles reduced motion, tab visibility, off-screen
pausing, and context loss (see `THIRD_PARTY_NOTICES.md`).

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
```

## Deploy

Pushes to `main` build and publish to GitHub Pages via `.github/workflows/deploy.yml`.
