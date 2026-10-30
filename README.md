# tungcodeforfun.github.io

Personal site for Tung Nguyen, Senior Software Engineer in New York, served at https://tungthanhnguyen.com.

One quiet page in three zones: the build's commit on the left, a narrow text column in the middle (intro, log, projects, years), a live New York clock and the section nav on the right. Two koi drawn in text symbols swim in the white space above the text and underneath it. Where a fish passes under a paragraph you see it faintly through the words, and the words part a pixel or two, but only while you are not reading: the moment the pointer is over the column, you scroll, select or tab into the text, every word is back in place.

## How to edit

All copy lives in `src/content.ts`. Nothing else needs to change.

- **Prose** (the four intro paragraphs, each project's one-liner, the year summary and each year's story) is an entry with a `text` field. While `text` is empty, the page shows a grey placeholder of the suggested length (`words`) with a black label saying what goes there. Write your words between the quotes and the placeholder disappears:

  ```ts
  { key: 'intro.hello', label: 'Hello', words: 40, text: 'Your sentence here.' },
  ```

  Links inside prose use Markdown style: `'I build [Pullfolio](https://pullfolio.app) in the evenings.'`
- **Add a log row**: one line in `log`, newest first, date as `MM YYYY`; `href` is optional.

  ```ts
  { date: '03 2027', name: 'Something new', href: 'https://example.com' },
  ```

- **Add a project**: one line in `projects` with `name`, `href`, a short `status` (`Current` or a year) and a `line` prose entry.
- **Add a year**: one line in `years.entries`.
- Name, role, city, links, page title and description are in `profile` and `links`. Section titles are in `titles`.
- `public/resume.pdf` is the résumé; replace the file to update it.

Run `npm run dev` and the page reloads as you type.

## How it is built

- `src/render.ts` runs at build time (the `prerender` plugin in `vite.config.ts`): head tags, the whole page as static HTML with every word of the column wrapped in a span, two still frames of the koi as `<pre>` text for visitors without JavaScript, and the short sha of the commit being built (`GITHUB_SHA` in CI, `git rev-parse --short HEAD` locally).
- `src/koi/` is the drawing, plain TypeScript with no DOM: `koi.ts` is one fish (a 30-link spine and a painter that fills the silhouette cell by cell with glyphs), `pond.ts` is the two fish, where they like to be (`steer(home, avoid)`), taps and ripples.
- `src/client/main.ts` wires the page: the clock (`America/New_York`, ticks every second), the nav's current section, and the pond loop.
- `src/client/water.ts` paints the fish on a `<canvas>` behind the text. Wherever a cell lies under text it uses a "submerged" ink, the same colour mixed toward the page until its luminance keeps every grey on the page above WCAG AA.
- `src/client/reading.ts` decides whether you are reading: pointer over the column, any scroll, wheel, touch or key in the last second, a text selection, or focus inside the column. Twelve seconds without any input also counts, and the fish settle in the left margin.
- `src/client/surface.ts` moves the words: each word near a fish's spine shifts up to 2.4 px away from it, scaled by how calm the reader is (0 the moment they read, easing back to 1 over a second). On touch screens only lines in the top and bottom fifth of the screen may move.
- `prefers-reduced-motion`: one still frame, no word moves. Hidden tab: the loop stops.
- Inks and page colours are in `src/styles/site.css`, light and dark via `prefers-color-scheme`.
- Fonts: Hanken Grotesk for the text, a DejaVu Sans Mono subset for the koi and the sha (see `THIRD_PARTY_NOTICES.md`).

## Develop

```bash
npm ci
npm run dev
```

## Check

```bash
npm run lint
npm run typecheck
npm test
npm run build
npx vite preview --port 4187
CHROME_PATH=/path/to/chrome npm run e2e -- --url http://localhost:4187/
CHROME_PATH=/path/to/chrome npm run tour -- --url http://localhost:4187/ --out <dir>
```

`npm run e2e` runs axe in both themes at phone and desktop sizes, fails on console errors or horizontal overflow, checks every link, the sha against the built commit and the clock against `America/New_York`, measures text contrast over the fish and word displacement while reading (200 frames each), then lets the koi swim for 60 s with clicks, pointer moves and scrolls and fails on any console message. `npm run tour` saves the screenshot matrix (1440 and 390, both themes, top and scrolled, reduced motion), no-JS shots, the parting mid-motion, a 15 s `editorial.webm` and rAF frame times. Pick parts with `--only shots,nojs,parting,video,frames`.

`CHROME_PATH=… npm run assets -- --url http://localhost:4187/` re-renders `public/og.png` from the running site (1200×630, light) and the favicons from `public/favicon.svg`.

## Deploy

Pushes to `main` build and deploy to Cloudflare Workers static assets (`wrangler.jsonc`) via `.github/workflows/deploy.yml`, served at https://tungthanhnguyen.com. The workflow needs the repo secret `CLOUDFLARE_API_TOKEN` (account: Workers Scripts Write, Account Settings Read; zone `tungthanhnguyen.com`: Workers Routes Write, Zone Read) and the variable `CLOUDFLARE_ACCOUNT_ID`.
