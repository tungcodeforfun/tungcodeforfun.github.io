import { mkdir, rename } from 'node:fs/promises'
import { parseArgs } from 'node:util'
import { chromium } from 'playwright-core'

const { values } = parseArgs({
  options: {
    url: { type: 'string', default: 'http://localhost:4187/' },
    out: { type: 'string', default: 'tour' },
    only: { type: 'string', default: 'shots,nojs,ripple,video,frames' },
    wait: { type: 'string', default: '6000' },
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
  ['820', { width: 820, height: 1180 }, 2],
  ['768', { width: 768, height: 1024 }, 2],
  ['390', { width: 390, height: 844 }, 3],
]

async function context(viewport, scale, options = {}) {
  return browser.newContext({ viewport, deviceScaleFactor: scale, isMobile: scale > 1, hasTouch: scale > 1, ...options })
}

async function scrollToLog(page) {
  await page.evaluate(() => scrollTo({ top: document.querySelector('#log').offsetTop - innerHeight * 0.3, behavior: 'instant' }))
}

async function shots() {
  for (const [label, viewport, scale] of sizes) {
    for (const scheme of ['light', 'dark']) {
      const ctx = await context(viewport, scale, { colorScheme: scheme })
      const page = await ctx.newPage()
      await page.goto(values.url)
      await page.waitForSelector('html.live')
      if (scale === 1) await page.mouse.move(viewport.width - 60, 80)
      await page.waitForTimeout(Number(values.wait))
      await page.screenshot({ path: `${out}/editorial-${label}-${scheme}-top.png` })
      await scrollToLog(page)
      await page.waitForTimeout(Number(values.wait))
      await page.screenshot({ path: `${out}/editorial-${label}-${scheme}-scrolled.png` })
      console.log(`shot ${label} ${scheme} top + scrolled`)
      await ctx.close()
    }
    for (const scheme of ['light', 'dark']) {
      const ctx = await context(viewport, scale, { colorScheme: scheme, reducedMotion: 'reduce' })
      const page = await ctx.newPage()
      await page.goto(values.url)
      await page.waitForSelector('html.live')
      await page.waitForTimeout(1500)
      await page.evaluate(() => scrollTo({ top: innerHeight * 0.6, behavior: 'instant' }))
      await page.screenshot({ path: `${out}/editorial-${label}-${scheme}-reduced-scrolled.png` })
      console.log(`shot ${label} ${scheme} reduced motion, scrolled`)
      await ctx.close()
    }
  }
}

async function nojs() {
  for (const [label, viewport, scale] of sizes) {
    for (const scheme of ['light', 'dark']) {
      const ctx = await context(viewport, scale, { colorScheme: scheme, javaScriptEnabled: false })
      const page = await ctx.newPage()
      await page.goto(values.url, { waitUntil: 'networkidle' })
      await page.evaluate(() => scrollTo({ top: innerHeight * 0.6, behavior: 'instant' }))
      await page.screenshot({ path: `${out}/editorial-${label}-${scheme}-nojs-scrolled.png` })
      console.log(`no-js ${label} ${scheme}, scrolled`)
      await ctx.close()
    }
  }
}

async function ripple() {
  const ctx = await context({ width: 1440, height: 900 }, 2, { colorScheme: 'light', isMobile: false, hasTouch: false })
  const page = await ctx.newPage()
  await page.goto(values.url)
  await page.waitForSelector('html.live')
  await page.evaluate(() => scrollTo({ top: innerHeight * 0.75, behavior: 'instant' }))
  await page.mouse.move(80, 450)
  await page.waitForTimeout(2500)
  const lifted = () =>
    page.evaluate(() => [...document.querySelectorAll('main .w')].map((w) => [w, Math.abs(parseFloat(w.style.translate.split(' ')[1] || 0))]).filter(([, y]) => y > 3).map(([w]) => w.getBoundingClientRect()))
  let clip = null
  for (let i = 0; i < 240 && !clip; i++) {
    await page.waitForTimeout(100)
    const rects = await lifted()
    if (rects.length < 6) continue
    const r = rects[Math.floor(rects.length / 2)]
    clip = { x: Math.max(0, r.left - 220), y: Math.max(0, r.top - 80), width: 480, height: 180 }
  }
  if (!clip) throw new Error('no ripple within 24 s')
  const frames = []
  for (let i = 0; i < 8; i++) {
    const start = Date.now()
    frames.push((await page.screenshot({ clip })).toString('base64'))
    await page.waitForTimeout(Math.max(0, 120 - (Date.now() - start)))
  }
  await ctx.close()
  const sheet = await context({ width: 4 * 486 + 14, height: 400 }, 1)
  const board = await sheet.newPage()
  await board.setContent(
    `<body style="margin:0;padding:8px;background:#888;font:12px sans-serif;display:grid;grid-template-columns:repeat(4,480px);gap:6px">${frames
      .map((png, i) => `<figure style="margin:0;background:#fff"><img style="width:100%;display:block" src="data:image/png;base64,${png}"><figcaption style="padding:2px 4px">${i * 120} ms, 2x</figcaption></figure>`)
      .join('')}</body>`,
  )
  await board.screenshot({ path: `${out}/ripple-strip-2x.png`, fullPage: true })
  await sheet.close()
  console.log(`ripple strip ${out}/ripple-strip-2x.png`)
}

async function video() {
  const ctx = await context({ width: 1440, height: 900 }, 1, { colorScheme: 'light', recordVideo: { dir: out, size: { width: 1440, height: 900 } } })
  const page = await ctx.newPage()
  await page.goto(values.url)
  await page.waitForSelector('html.live')
  await page.mouse.move(1380, 80)
  await page.waitForTimeout(2500)
  await page.mouse.wheel(0, 520)
  await page.waitForTimeout(900)
  await page.mouse.move(80, 450, { steps: 12 })
  await page.waitForTimeout(6500)
  const target = await page.evaluate(() => {
    const r = document.querySelector('#intro .flow p:nth-child(2)').getBoundingClientRect()
    return { x: r.left + r.width / 2, y: r.top + 40 }
  })
  await page.mouse.move(target.x, target.y, { steps: 20 })
  await page.waitForTimeout(2500)
  await page.mouse.move(80, 450, { steps: 20 })
  await page.waitForTimeout(2600)
  const file = await page.video().path()
  await ctx.close()
  await rename(file, `${out}/ripple.webm`)
  console.log(`video ${out}/ripple.webm`)
}

function quantile(list, q) {
  const sorted = [...list].sort((a, b) => a - b)
  return sorted[Math.floor(q * (sorted.length - 1))]
}

async function frames() {
  for (const [label, viewport, scale] of sizes.filter(([label]) => label === '1440' || label === '390')) {
    const ctx = await context(viewport, scale, { colorScheme: 'light' })
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
    await page.evaluate(() => scrollTo({ top: document.querySelector('#intro .flow').offsetTop - 60, behavior: 'instant' }))
    if (scale === 1) await page.mouse.move(viewport.width - 60, 80)
    await page.waitForTimeout(2500)
    await page.evaluate(() => (window.__probe = { stamps: [], work: [] }))
    await page.waitForTimeout(10000)
    const { stamps, work } = await page.evaluate(() => window.__probe)
    const gaps = stamps.slice(1).map((t, i) => t - stamps[i])
    const fmt = (n) => n.toFixed(1)
    console.log(
      `frames ${label}: ${stamps.length} in 10 s, interval p50 ${fmt(quantile(gaps, 0.5))} ms p95 ${fmt(quantile(gaps, 0.95))} ms, ${gaps.filter((g) => g > 25).length} > 25 ms, callback work p50 ${quantile(work, 0.5).toFixed(2)} ms p95 ${quantile(work, 0.95).toFixed(2)} ms`,
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
if (parts.has('nojs')) await nojs()
if (parts.has('ripple')) await ripple()
if (parts.has('video')) await video()
if (parts.has('frames')) await frames()
await browser.close()
