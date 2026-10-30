import { mkdir, rename } from 'node:fs/promises'
import { parseArgs } from 'node:util'
import { chromium } from 'playwright-core'

const { values } = parseArgs({
  options: {
    url: { type: 'string', default: 'http://localhost:4187/' },
    out: { type: 'string', default: 'tour' },
    only: { type: 'string', default: 'shots,nojs,parting,video,frames' },
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
      await page.screenshot({ path: `${out}/editorial-${label}-${scheme}-reduced.png` })
      console.log(`shot ${label} ${scheme} reduced motion`)
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
      await page.screenshot({ path: `${out}/editorial-${label}-${scheme}-nojs.png` })
      console.log(`no-js ${label} ${scheme}`)
      await ctx.close()
    }
  }
}

async function parting() {
  for (const [label, viewport, scale] of sizes) {
    const ctx = await context(viewport, scale, { colorScheme: 'light' })
    const page = await ctx.newPage()
    await page.goto(values.url)
    await page.waitForSelector('html.live')
    await page.evaluate(() => scrollTo({ top: document.querySelector('#intro .flow').offsetTop - 60, behavior: 'instant' }))
    const target = await page.evaluate(() => {
      const r = document.querySelector('#intro .flow p:nth-child(2)').getBoundingClientRect()
      return { x: r.left + r.width / 2, y: r.top - 8 }
    })
    let best = { shift: 0, at: null }
    for (let attempt = 0; attempt < 6 && best.shift < 1.6; attempt++) {
      if (scale === 1) {
        await page.mouse.click(target.x, target.y)
        await page.mouse.move(viewport.width - 60, 80)
      } else await page.touchscreen.tap(target.x, target.y)
      for (let i = 0; i < 40; i++) {
        await page.waitForTimeout(100)
        const now = await page.evaluate(() => {
          let shift = 0
          let at = null
          for (const w of document.querySelectorAll('.w')) {
            if (!w.style.translate) continue
            const [x, y = 0] = w.style.translate.split(' ').map(parseFloat)
            const d = Math.hypot(x, y)
            if (d > shift) {
              shift = d
              const r = w.getBoundingClientRect()
              at = { x: r.left + r.width / 2, y: r.top + r.height / 2 }
            }
          }
          return { shift, at }
        })
        if (now.shift > best.shift) {
          best = now
          await page.screenshot({ path: `${out}/editorial-${label}-parting.png` })
          const w = Math.min(viewport.width, 360)
          const h = 200
          const x = Math.max(0, Math.min(viewport.width - w, now.at.x - w / 2))
          const y = Math.max(0, Math.min(viewport.height - h, now.at.y - h / 2))
          await page.screenshot({ path: `${out}/editorial-${label}-parting-zoom.png`, clip: { x, y, width: w, height: h }, scale: 'device' })
        }
        if (best.shift >= 2) break
      }
    }
    console.log(`parting ${label}: words displaced up to ${best.shift.toFixed(2)} px in the saved frame`)
    await ctx.close()
  }
}

async function video() {
  const ctx = await context({ width: 1440, height: 900 }, 1, { colorScheme: 'light', recordVideo: { dir: out, size: { width: 1440, height: 900 } } })
  const page = await ctx.newPage()
  await page.goto(values.url)
  await page.waitForSelector('html.live')
  await page.mouse.move(1380, 80)
  await page.waitForTimeout(3500)
  await page.mouse.wheel(0, 520)
  await page.waitForTimeout(900)
  const target = await page.evaluate(() => {
    const r = document.querySelector('#intro .flow p:nth-child(2)').getBoundingClientRect()
    return { x: r.left + r.width / 2, y: r.top - 8 }
  })
  await page.mouse.click(target.x, target.y)
  await page.mouse.move(1380, 300, { steps: 12 })
  await page.waitForTimeout(4500)
  await page.mouse.move(target.x, target.y + 120, { steps: 20 })
  await page.waitForTimeout(3000)
  await page.mouse.move(1380, 300, { steps: 20 })
  await page.waitForTimeout(2600)
  const file = await page.video().path()
  await ctx.close()
  await rename(file, `${out}/editorial.webm`)
  console.log(`video ${out}/editorial.webm`)
}

function quantile(list, q) {
  const sorted = [...list].sort((a, b) => a - b)
  return sorted[Math.floor(q * (sorted.length - 1))]
}

async function frames() {
  for (const [label, viewport, scale] of sizes) {
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
if (parts.has('nojs')) await nojs()
if (parts.has('parting')) await parting()
if (parts.has('video')) await video()
if (parts.has('frames')) await frames()
await browser.close()
