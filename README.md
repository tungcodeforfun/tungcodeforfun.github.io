# tungcodeforfun.github.io

Personal site for Tung Nguyen, Senior Software Engineer in New York City.

Single-page React 19 + Vite + TypeScript site. The live background is the RibbonField WebGL
shader from [ThreeUI](https://github.com/MengTo/threeui), vendored under `src/background/`
and adapted for reduced motion, tab visibility, context loss, and a scroll-driven fade
(see `THIRD_PARTY_NOTICES.md`).

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
