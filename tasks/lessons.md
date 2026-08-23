# Lessons

## 2026-08-22: once a direction is picked, stop gating

User picked option 3 (rebuild) and answered the approaches question with a single letter, then
said "implement stop asking". After the direction is chosen, do not ask for approval on the
design write-up, the spec, or deploy; decide sensible defaults (font pairing, which shader,
vendoring vs dependency) inline, state them in one line, and run build -> verify -> deploy.
Ask only when two readings would produce materially different sites.

## 2026-08-22: keep copy plain

User cut the hero positioning paragraph as "corny". Don't write marketing-style self
descriptions for this site; role, city, and links carry the hero. Prefer terse, factual copy
everywhere (what it is, what it's built with), no narrative flourish.

## 2026-08-22: ambient background under reduced motion, and text over shaders

- Freezing the shader under `prefers-reduced-motion` made the site look broken on the user's own
  PC (Windows "Animation effects" off sets that media query). For ambient, low-contrast
  backgrounds: slow it down and drop pointer parallax, don't stop it. Reserve full stops for
  interaction-driven or large-scale motion.
- Screenshots on a headless swiftshader run understate how bright a shader is on a real
  display. Put a scrim between shader and text column from the start, and verify readability
  at the brightest expected state, not the dimmed one.
- When measuring animation in Playwright, `canvas.toDataURL()` on a WebGL canvas without
  `preserveDrawingBuffer` is blank: count rAF callbacks via `addInitScript` instead. Start
  `vite preview` from the project dir (shell cwd resets between tool calls) and stop it by the
  pid from `ss -ltnp`, never `pkill -f`, which matches the calling shell and kills it.

## 2026-08-22: "follow X design" means adopt X's system, not sprinkle X's assets

Adding a floating silver blob to the hero was rejected as "random". When the user names a
reference (ThreeUI), look at how that reference actually composes pages (here: all JetBrains
Mono, monotone near-black, hairline tiles, tag pills, white filled buttons, every shader framed
in a bordered screen with a caption) and rebuild in that system. Color comes from the canvases,
not from type. Do not invent focal objects the reference would never place.
