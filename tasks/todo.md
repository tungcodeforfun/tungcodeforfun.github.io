# Rebuild around ThreeUI RibbonField (2026-08-22)

- [x] Convert project to TypeScript, add Vitest + Testing Library
- [x] Vendor + adapt RibbonField (dim uniform, window pointer, reduced motion, context loss, visibility)
- [x] BackgroundBoundary with static fallback
- [x] content.ts with all copy
- [x] Sections: Hero, Work, Experience, Projects, Contact
- [x] Styles: tokens, base, layout; scroll-driven dim with bookend at page end
- [x] index.html meta, favicon, fonts, robots.txt; remove Vite boilerplate
- [x] Tests green (11), lint + tsc + build green
- [x] Screenshots desktop/mobile/reduced-motion, Lighthouse
- [x] Merge to main, push, confirm deploy

## Review

- Vendored RibbonField instead of installing `@designcodeio/threeui`: the npm package is 56 MB
  with two bundled three.js copies; the shader is ~100 lines of raw WebGL. MIT notice in
  THIRD_PARTY_NOTICES.md and a footer credit.
- Adaptations over upstream: `dim` uniform (replaces CSS filter), pointer on `window` so
  content on top keeps parallax, reduced motion draws one still frame, `visibilitychange`
  pause, `webglcontextlost`/`restored` rebuild via a generation counter, DPR cap 1.5 under 720px.
- Dim curve: 0 in hero, ramps to 0.88 over ~0.9 viewport of scroll, eases back to 0.44 at
  the page end so the contact section echoes the hero. Small screens floor at 0.45.
- Bundle: 66 KB gz JS, 3 KB gz CSS. Lighthouse desktop: perf 100, BP 100, a11y/SEO after
  contrast + robots fixes (see final numbers in the PR/commit).
- Old macOS-desktop site (App.jsx/App.css, 3.4k lines) removed; content ported to content.ts
  and refreshed from the GitHub profile README.
