import { mkdir, rename } from 'node:fs/promises'
import { parseArgs } from 'node:util'
import { chromium } from 'playwright-core'

const { values } = parseArgs({
  options: {
    url: { type: 'string', default: 'http://localhost:4185/' },
    out: { type: 'string', default: 'tour' },
    only: { type: 'string', default: 'shots,tap,nojs,video,frames' },
    wait: { type: 'string', default: '8000' },
  },
})
const executablePath = process.env.CHROME_PATH
if (!executablePath) throw new Error('Set CHROME_PATH to a Chrome or Chromium binary')
const parts = new Set(values.only.split(','))
const out = values.out.replace(/\/$/, '')
await mkdir(out, { recursive: true })
const browser = await chromium.launch({ executablePath })
const sizes = [
  ['1440', { width: 1440, height: 900 }, 1],
  ['390', { width: 390, height: 844 }, 3],
]

async function context(viewport, scale, options = {}) {
  return browser.newContext({ viewport, deviceScaleFactor: scale, isMobile: scale > 1, hasTouch: scale > 1, ...options })
}

async function shots() {
  for (const [label, viewport, scale] of sizes) {
    for (const scheme of ['light', 'dark']) {
      for (const reducedMotion of ['no-preference', 'reduce']) {
        const ctx = await context(viewport, scale, { colorScheme: scheme, reducedMotion })
        const page = await ctx.newPage()
        await page.goto(values.url)
        await page.waitForSelector('html.live')
        await page.waitForTimeout(Number(values.wait))
        const name = `koi-${label}-${scheme}-${reducedMotion === 'reduce' ? 'reduced' : 'motion'}.png`
        await page.screenshot({ path: `${out}/${name}` })
        console.log(`shot ${name}`)
        await ctx.close()
      }
    }
  }
}

async function tap() {
  for (const [label, viewport, scale] of sizes) {
    const ctx = await context(viewport, scale, { colorScheme: 'dark' })
    const page = await ctx.newPage()
    await page.goto(values.url)
    await page.waitForSelector('html.live')
    await page.waitForTimeout(3000)
    const x = viewport.width * 0.62
    const y = viewport.height * 0.3
    if (scale > 1) await page.touchscreen.tap(x, y)
    else await page.mouse.click(x, y)
    await page.waitForTimeout(700)
    await page.screenshot({ path: `${out}/koi-${label}-dark-tap-ripple.png` })
    await page.waitForTimeout(2800)
    await page.screenshot({ path: `${out}/koi-${label}-dark-tap-turn.png` })
    console.log(`tap ${label} at ${Math.round(x)},${Math.round(y)}`)
    await ctx.close()
  }
}

async function nojs() {
  for (const [label, viewport, scale] of sizes) {
    for (const scheme of ['light', 'dark']) {
      const ctx = await context(viewport, scale, { colorScheme: scheme, javaScriptEnabled: false })
      const page = await ctx.newPage()
      await page.goto(values.url, { waitUntil: 'networkidle' })
      await page.screenshot({ path: `${out}/koi-${label}-${scheme}-nojs.png` })
      console.log(`no-js ${label} ${scheme}`)
      await ctx.close()
    }
  }
}

async function video() {
  const ctx = await context({ width: 1440, height: 900 }, 1, { colorScheme: 'dark', recordVideo: { dir: out, size: { width: 1440, height: 900 } } })
  const page = await ctx.newPage()
  await page.goto(values.url)
  await page.waitForSelector('html.live')
  await page.waitForTimeout(6000)
  await page.mouse.click(900, 300)
  await page.waitForTimeout(9000)
  const file = await page.video().path()
  await ctx.close()
  await rename(file, `${out}/koi.webm`)
  console.log(`video ${out}/koi.webm`)
}

function quantile(list, q) {
  const sorted = [...list].sort((a, b) => a - b)
  return sorted[Math.floor(q * (sorted.length - 1))]
}

async function frames() {
  for (const [label, viewport, scale] of sizes) {
    const ctx = await context(viewport, scale, { colorScheme: 'dark' })
    await ctx.addInitScript(() => {
      const raf = window.requestAnimationFrame.bind(window)
      window.__probe = { stamps: [], work: [] }
      window.requestAnimationFrame = (callback) =>
        raf((time) => {
          const start = performance.now()
          callback(time)
          window.__probe.work.push(performance.now() - start)
          window.__probe.stamps.push(time)
        })
    })
    const page = await ctx.newPage()
    await page.goto(values.url)
    await page.waitForSelector('html.live')
    await page.waitForTimeout(2000)
    await page.evaluate(() => (window.__probe = { stamps: [], work: [] }))
    await page.waitForTimeout(10000)
    const { stamps, work } = await page.evaluate(() => window.__probe)
    const gaps = stamps.slice(1).map((t, i) => t - stamps[i])
    const fmt = (n) => n.toFixed(1)
    console.log(
      `frames ${label}: ${stamps.length} in 10 s, interval p50 ${fmt(quantile(gaps, 0.5))} ms p95 ${fmt(quantile(gaps, 0.95))} ms, callback work p50 ${quantile(work, 0.5).toFixed(2)} ms p95 ${quantile(work, 0.95).toFixed(2)} ms`,
    )
    const hidden = await page.evaluate(async () => {
      Object.defineProperty(document, 'hidden', { configurable: true, get: () => true })
      document.dispatchEvent(new Event('visibilitychange'))
      const before = window.__probe.stamps.length
      await new Promise((resolve) => setTimeout(resolve, 1500))
      return window.__probe.stamps.length - before
    })
    console.log(`frames ${label}: ${hidden} rAF callbacks in 1.5 s while the tab reports hidden`)
    await ctx.close()
  }
}

if (parts.has('shots')) await shots()
if (parts.has('tap')) await tap()
if (parts.has('nojs')) await nojs()
if (parts.has('video')) await video()
if (parts.has('frames')) await frames()
await browser.close()
