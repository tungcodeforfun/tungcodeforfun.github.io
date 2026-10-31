import { execSync } from 'node:child_process'
import { readFile } from 'node:fs/promises'
import { createRequire } from 'node:module'
import { parseArgs } from 'node:util'
import { chromium } from 'playwright-core'

const { values } = parseArgs({
  options: {
    url: { type: 'string', default: 'http://localhost:4187/' },
    soak: { type: 'string', default: '60' },
    sha: { type: 'string', default: '' },
    frames: { type: 'string', default: '200' },
  },
})
const executablePath = process.env.CHROME_PATH
if (!executablePath) throw new Error('Set CHROME_PATH to a Chrome or Chromium binary')

const axeSource = await readFile(createRequire(import.meta.url).resolve('axe-core/axe.min.js'), 'utf8')
const expectedSha = values.sha || execSync('git rev-parse --short=7 HEAD', { encoding: 'utf8' }).trim()
const frames = Number(values.frames)
const viewports = { desktop: { width: 1440, height: 900 }, phone: { width: 390, height: 844 } }
const browser = await chromium.launch({ executablePath })
let failed = false

function fail(condition, message) {
  console.log(`${condition ? 'FAIL' : 'ok  '} ${message}`)
  if (condition) failed = true
}

async function open(viewport, scheme) {
  const context = await browser.newContext({
    viewport: viewports[viewport],
    colorScheme: scheme,
    isMobile: viewport === 'phone',
    hasTouch: viewport === 'phone',
  })
  await context.addInitScript(() => {
    window.__shift = 0
    new PerformanceObserver((list) => {
      for (const entry of list.getEntries()) if (!entry.hadRecentInput) window.__shift += entry.value
    }).observe({ type: 'layout-shift', buffered: true })
  })
  const page = await context.newPage()
  const messages = []
  page.on('console', (m) => ['error', 'warning'].includes(m.type()) && messages.push(`${m.type()}: ${m.text()}`))
  page.on('pageerror', (e) => messages.push(`pageerror: ${e.message}`))
  page.on('requestfailed', (r) => messages.push(`requestfailed: ${r.url()}`))
  await page.goto(values.url, { waitUntil: 'networkidle' })
  await page.waitForSelector('html.live')
  return { context, page, messages }
}

async function audit(viewport, scheme) {
  const { context, page, messages } = await open(viewport, scheme)
  await page.waitForTimeout(1500)
  await page.addScriptTag({ content: axeSource })
  const results = await page.evaluate(() => window.axe.run(document, { resultTypes: ['violations'], rules: { 'target-size': { enabled: true } } }))
  for (const v of results.violations) console.log(`  [${v.impact}] ${v.id}: ${v.nodes.length} node(s) ${v.nodes[0]?.target}`)
  fail(results.violations.length > 0, `axe ${viewport}/${scheme}: ${results.violations.length} violations`)
  const overflow = await page.evaluate(() => document.documentElement.scrollWidth - innerWidth)
  fail(overflow > 0, `horizontal overflow ${viewport}/${scheme}: ${overflow}px`)
  await page.evaluate(() => scrollTo({ top: document.body.scrollHeight, behavior: 'instant' }))
  await page.waitForTimeout(600)
  await page.evaluate(() => scrollTo({ top: 0, behavior: 'instant' }))
  await page.waitForTimeout(600)
  const shift = await page.evaluate(() => window.__shift)
  fail(shift > 0, `layout shift ${viewport}/${scheme}: CLS ${shift.toFixed(4)}`)
  fail(messages.length > 0, `console ${viewport}/${scheme}: ${messages.length ? messages.join(' | ') : 'clean'}`)
  await context.close()
}

async function stamps() {
  const { context, page } = await open('desktop', 'light')
  const sha = await page.textContent('.sha')
  fail(sha !== expectedSha, `sha on the page ${sha}, built commit ${expectedSha}`)
  const shown = await page.textContent('.time')
  const now = new Intl.DateTimeFormat('en-US', { timeZone: 'America/New_York', hour: '2-digit', minute: '2-digit', second: '2-digit', hourCycle: 'h23' }).format(new Date())
  const seconds = (t) => t.split(':').reduce((a, v) => a * 60 + Number(v), 0)
  const drift = Math.abs(seconds(shown) - seconds(now))
  fail(drift > 2, `clock shows ${shown}, America/New_York is ${now} (drift ${drift} s)`)
  await page.waitForTimeout(2100)
  const later = await page.textContent('.time')
  fail(seconds(later) - seconds(shown) < 2, `clock ticks: ${shown} -> ${later} after 2.1 s`)
  await context.close()
}

function installProbe() {
  const parse = (c) => c.match(/\d+(\.\d+)?/g).map(Number).slice(0, 3)
  const hex = (h) => {
    const s = h.replace('#', '')
    const f = s.length === 3 ? [...s].map((c) => c + c).join('') : s
    return [0, 2, 4].map((i) => parseInt(f.slice(i, i + 2), 16))
  }
  const lum = ([r, g, b]) => {
    const l = (v) => ((v /= 255) <= 0.04045 ? v / 12.92 : ((v + 0.055) / 1.055) ** 2.4)
    return 0.2126 * l(r) + 0.7152 * l(g) + 0.0722 * l(b)
  }
  const ratio = (a, b) => {
    const [x, y] = [lum(a), lum(b)].sort((p, q) => q - p)
    return (x + 0.05) / (y + 0.05)
  }
  const base = hex(getComputedStyle(document.documentElement).getPropertyValue('--bg').trim())
  const texts = [...document.querySelectorAll('main .w, main a, main h1, .role, .side .clock span, .side nav a, .colophon > *')]
  const blend = (rgb, a) => rgb.map((v, k) => v * a + base[k] * (1 - a))

  function canvasInk(count) {
    const canvas = document.querySelector('.pond canvas')
    const box = canvas.getBoundingClientRect()
    const scale = canvas.width / box.width
    const image = canvas.getContext('2d').getImageData(0, 0, canvas.width, canvas.height).data
    let inked = 0
    if (count) for (let i = 3; i < image.length; i += 4) if (image[i] && box.top + Math.floor((i - 3) / 4 / canvas.width) / scale < innerHeight) inked++
    const darkest = (r, color) => {
      let low = null
      const x0 = Math.max(0, Math.floor((r.left - box.left) * scale))
      const x1 = Math.min(canvas.width - 1, Math.ceil((r.right - box.left) * scale))
      const y0 = Math.max(0, Math.floor((r.top - box.top) * scale))
      const y1 = Math.min(canvas.height - 1, Math.ceil((r.bottom - box.top) * scale))
      for (let y = y0; y <= y1; y++) {
        for (let x = x0; x <= x1; x++) {
          const i = (y * canvas.width + x) * 4
          if (!image[i + 3]) continue
          const c = ratio(color, blend([image[i], image[i + 1], image[i + 2]], image[i + 3] / 255))
          if (low === null || c < low) low = c
        }
      }
      return low
    }
    return { inked, darkest }
  }

  function glyphInk() {
    const glyphs = []
    const range = document.createRange()
    for (const pre of document.querySelectorAll('pre.still')) {
      if (getComputedStyle(pre).display === 'none') continue
      const walker = document.createTreeWalker(pre, NodeFilter.SHOW_TEXT)
      while (walker.nextNode()) {
        const node = walker.currentNode
        const style = getComputedStyle(node.parentElement)
        const px = blend(parse(style.color), Number(style.opacity))
        for (let i = 0; i < node.length; i++) {
          if (/\s/.test(node.data[i])) continue
          range.setStart(node, i)
          range.setEnd(node, i + 1)
          const r = range.getBoundingClientRect()
          if (r.bottom > 0 && r.top < innerHeight) glyphs.push({ r, px })
        }
      }
    }
    const darkest = (r, color) => {
      let low = null
      for (const g of glyphs) {
        if (g.r.right <= r.left || g.r.left >= r.right || g.r.bottom <= r.top || g.r.top >= r.bottom) continue
        const c = ratio(color, g.px)
        if (low === null || c < low) low = c
      }
      return low
    }
    return { inked: glyphs.length, darkest }
  }

  window.__measure = (count = false) => {
    const { inked, darkest } = document.documentElement.classList.contains('live') ? canvasInk(count) : glyphInk()
    let worst = Infinity
    let worstText = ''
    let shift = 0
    let underFish = 0
    for (const el of texts) {
      const r = el.getBoundingClientRect()
      if (r.bottom < 0 || r.top > innerHeight || !r.width) continue
      if (el.style.translate) shift = Math.max(shift, Math.hypot(...el.style.translate.split(' ').map(parseFloat)))
      const low = darkest(r, parse(getComputedStyle(el).color))
      if (low === null) continue
      underFish++
      if (low < worst) {
        worst = low
        worstText = el.textContent.trim().slice(0, 24)
      }
    }
    return { worst, worstText, shift, underFish, inked }
  }
}

async function sample(page, count, scroll) {
  await page.evaluate(installProbe)
  return page.evaluate(
    ({ count, scroll }) =>
      new Promise((resolve) => {
        let worst = Infinity
        let worstText = ''
        let maxShift = 0
        let shifted = 0
        let underFish = 0
        let n = 0
        let scrolledAt = performance.now()
        let longest = 0
        let flip = 1
        let landed = !scroll
        let asked = performance.now()
        if (scroll) {
          addEventListener('scroll', () => {
            landed = true
            scrolledAt = performance.now()
          })
          scrollBy(0, 2)
        }
        const step = () => setTimeout(measure, 0)
        const measure = () => {
          const now = performance.now()
          if (scroll && now - asked > 250) {
            scrollBy(0, (flip = -flip) * 2)
            asked = now
          }
          if (!landed) return requestAnimationFrame(step)
          longest = Math.max(longest, now - scrolledAt)
          const frame = window.__measure()
          underFish += frame.underFish
          if (frame.worst < worst) {
            worst = frame.worst
            worstText = frame.worstText
          }
          if (frame.shift > 0) shifted++
          maxShift = Math.max(maxShift, frame.shift)
          if (++n < count) requestAnimationFrame(step)
          else resolve({ worst, worstText, maxShift, shifted, underFish, longest })
        }
        requestAnimationFrame(() => requestAnimationFrame(step))
      }),
    { count, scroll },
  )
}

async function stillFrame(viewport, scheme, mode) {
  const context = await browser.newContext({
    viewport: viewports[viewport],
    colorScheme: scheme,
    isMobile: viewport === 'phone',
    hasTouch: viewport === 'phone',
    ...(mode === 'reduced motion' ? { reducedMotion: 'reduce' } : { javaScriptEnabled: false }),
  })
  const page = await context.newPage()
  await page.goto(values.url, { waitUntil: 'networkidle' })
  if (mode === 'reduced motion') await page.waitForSelector('html.live')
  await page.waitForTimeout(300)
  await page.evaluate(installProbe)
  let worst = Infinity
  let worstText = ''
  let underFish = 0
  let inkedAtTop = 0
  for (let top = 0; top <= 3000; top += 150) {
    await page.evaluate((y) => scrollTo({ top: y, behavior: 'instant' }), top)
    await page.waitForTimeout(60)
    const frame = await page.evaluate((count) => window.__measure(count), top === 0)
    if (!top) inkedAtTop = frame.inked
    underFish += frame.underFish
    if (frame.worst < worst) {
      worst = frame.worst
      worstText = frame.worstText
    }
  }
  fail(inkedAtTop === 0, `${mode} ${viewport}/${scheme}: still koi drawn at the top (${inkedAtTop} ink ${mode === 'reduced motion' ? 'pixels' : 'glyphs'})`)
  fail(
    worst < 4.5,
    `contrast ${viewport}/${scheme} ${mode}, scrolled 0–3000 px: ${worst === Infinity ? 'no text over fish' : `worst ${worst.toFixed(2)}:1 ("${worstText}")`} (${underFish} word-positions over fish)`,
  )
  await context.close()
}

async function legibility(viewport, scheme) {
  const { context, page } = await open(viewport, scheme)
  const desktop = viewport === 'desktop'
  await page.evaluate(() => scrollTo({ top: document.querySelector('#intro .flow').offsetTop - 80, behavior: 'instant' }))
  const column = await page.evaluate(() => {
    const r = document.querySelector('#name').getBoundingClientRect()
    const flow = document.querySelector('#intro .flow p:nth-child(2)').getBoundingClientRect()
    return { left: r.left, width: document.querySelector('main section').clientWidth, gapY: flow.top - 8 }
  })
  const margin = { x: desktop ? 1300 : 0, y: 120 }
  if (desktop) await page.mouse.move(margin.x, margin.y)
  const lure = async () => {
    const x = column.left + column.width / 2
    if (desktop) {
      await page.mouse.click(x, column.gapY)
      await page.mouse.move(margin.x, margin.y)
    } else await page.touchscreen.tap(x, column.gapY)
  }
  await lure()
  await page.waitForTimeout(3500)
  const calm = await sample(page, frames, false)
  fail(calm.shifted === 0, `${viewport}/${scheme} calm (pointer in the margin, no input): words rippled in ${calm.shifted}/${frames} frames, max ${calm.maxShift.toFixed(2)} px`)
  fail(calm.underFish === 0, `${viewport}/${scheme} calm: text over fish ink in ${calm.underFish} word-frames`)
  fail(calm.worst < 4.5, `contrast ${viewport}/${scheme} calm: worst ${calm.worst.toFixed(2)}:1 ("${calm.worstText}") over ${frames} frames`)
  let reading
  if (desktop) {
    await lure()
    await page.waitForTimeout(3500)
    await page.mouse.move(column.left + column.width / 2, 420, { steps: 4 })
    await page.waitForTimeout(3000)
    reading = await sample(page, frames, false)
    fail(reading.maxShift > 0, `pointer over the column ${viewport}/${scheme}: max displacement ${reading.maxShift.toFixed(2)} px over ${frames} frames (${reading.underFish} word-frames over fish)`)
    fail(reading.worst < 4.5, `contrast ${viewport}/${scheme} reading: worst ${reading.worst.toFixed(2)}:1`)
    await page.mouse.move(margin.x, margin.y)
  }
  await lure()
  await page.waitForTimeout(3500)
  const scrolling = await sample(page, frames, true)
  fail(
    scrolling.maxShift > 0 || scrolling.longest >= 1000,
    `within 1 s of a scroll ${viewport}/${scheme}: max displacement ${scrolling.maxShift.toFixed(2)} px over ${frames} frames, each ≤ ${Math.round(scrolling.longest)} ms after a scroll (${scrolling.underFish} word-frames over fish)`,
  )
  fail(scrolling.worst < 4.5, `contrast ${viewport}/${scheme} scrolling: worst ${scrolling.worst.toFixed(2)}:1`)
  await context.close()
}

async function hold(scheme) {
  const { context, page } = await open('phone', scheme)
  const cdp = await context.newCDPSession(page)
  await page.evaluate(() => scrollTo({ top: innerHeight * 0.7, behavior: 'instant' }))
  let moved = 0
  let count = 0
  for (const band of [0.1, 0.85, 0.15, 0.8]) {
    await page.waitForTimeout(4000)
    const point = await page.evaluate((band) => {
      const y = innerHeight * band
      const mid = (r) => (r.top + r.bottom) / 2
      const rects = [...document.querySelectorAll('main .w')].map((w) => w.getBoundingClientRect()).filter((r) => r.bottom > 0 && r.top < innerHeight)
      const r = rects.reduce((a, b) => (Math.abs(mid(b) - y) < Math.abs(mid(a) - y) ? b : a))
      return { x: r.left + r.width / 2, y: mid(r) }
    }, band)
    await cdp.send('Input.dispatchTouchEvent', { type: 'touchStart', touchPoints: [point] })
    const held = await page.evaluate(
      () =>
        new Promise((resolve) => {
          const words = [...document.querySelectorAll('main .w')]
          const start = performance.now()
          let max = 0
          let n = 0
          const step = () => {
            for (const w of words) if (w.style.translate) max = Math.max(max, Math.hypot(...w.style.translate.split(' ').map(parseFloat)))
            n++
            if (performance.now() - start < 5000) requestAnimationFrame(step)
            else resolve({ max, n })
          }
          requestAnimationFrame(step)
        }),
    )
    await cdp.send('Input.dispatchTouchEvent', { type: 'touchEnd', touchPoints: [] })
    moved = Math.max(moved, held.max)
    count += held.n
  }
  fail(moved > 0, `finger held still 5 s on a word, phone/${scheme}, 4 holds in the top and bottom bands: max displacement ${moved.toFixed(2)} px over ${count} frames`)
  await context.close()
}

async function checkLinks() {
  const { context, page } = await open('desktop', 'light')
  const targets = await page.evaluate(() => [
    ...new Set([
      ...[...document.querySelectorAll('a[href], link[href]')].map((a) => a.getAttribute('href')),
      ...[...document.querySelectorAll('script[src]')].map((s) => s.getAttribute('src')),
      ...[...document.querySelectorAll('meta[property="og:image"], meta[name="twitter:image"]')].map((m) => m.getAttribute('content')),
    ]),
  ])
  for (const href of targets) {
    if (href.startsWith('mailto:') || href.startsWith('#')) {
      console.log(`     link ${href}`)
      continue
    }
    const url = new URL(href.replace('https://tungthanhnguyen.com/', values.url), values.url)
    const response = await fetch(url, { redirect: 'follow', headers: { 'user-agent': 'Mozilla/5.0 link-check' } })
    const bot = response.status === 999 && url.hostname.endsWith('linkedin.com')
    fail(response.status !== 200 && !bot, `link ${response.status}${bot ? ' (LinkedIn refuses bots)' : ''} ${href}${url.href !== href ? ` (checked ${url.href})` : ''}`)
  }
  await context.close()
}

async function soak() {
  const { context, page, messages } = await open('desktop', 'dark')
  const seconds = Number(values.soak)
  for (let s = 0; s < seconds; s++) {
    if (s % 10 === 3) await page.mouse.click(200 + s * 7, 160 + (s % 7) * 40)
    if (s % 10 === 6) await page.mouse.wheel(0, s % 20 < 10 ? 500 : -500)
    await page.mouse.move(700 + Math.sin(s) * 500, 400 + Math.cos(s) * 250, { steps: 6 })
    await page.waitForTimeout(1000)
  }
  fail(messages.length > 0, `console after ${seconds} s of swimming, clicks, scrolls and pointer moves: ${messages.length ? messages.join(' | ') : 'clean'}`)
  await context.close()
}

for (const viewport of Object.keys(viewports)) for (const scheme of ['light', 'dark']) await audit(viewport, scheme)
await stamps()
for (const viewport of Object.keys(viewports)) for (const scheme of ['light', 'dark']) await legibility(viewport, scheme)
for (const scheme of ['light', 'dark']) await hold(scheme)
for (const mode of ['reduced motion', 'no JavaScript']) for (const viewport of Object.keys(viewports)) for (const scheme of ['light', 'dark']) await stillFrame(viewport, scheme, mode)
await checkLinks()
await soak()
await browser.close()
console.log(failed ? 'FAILED' : 'OK')
process.exit(failed ? 1 : 0)
