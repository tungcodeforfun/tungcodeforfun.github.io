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
  const results = await page.evaluate(() => window.axe.run(document, { resultTypes: ['violations'] }))
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

async function sample(page, count, scroll) {
  return page.evaluate(
    ({ count, scroll }) =>
      new Promise((resolve) => {
        const canvas = document.querySelector('.pond canvas')
        const ctx = canvas.getContext('2d')
        const scale = canvas.width / innerWidth
        const bg = getComputedStyle(document.documentElement).getPropertyValue('--bg').trim()
        const parse = (c) => {
          const m = c.match(/\d+(\.\d+)?/g).map(Number)
          return m.slice(0, 3)
        }
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
        const base = hex(bg)
        const texts = [...document.querySelectorAll('main .w, main h1, .role, .contact a, .side .clock span, .side nav a, .colophon > *')]
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
          const image = ctx.getImageData(0, 0, canvas.width, canvas.height).data
          let frameShift = 0
          for (const el of texts) {
            const r = el.getBoundingClientRect()
            if (r.bottom < 0 || r.top > innerHeight || !r.width) continue
            if (el.classList.contains('w')) {
              const t = el.style.translate
              if (t) {
                const [x, y = 0] = t.split(' ').map(parseFloat)
                frameShift = Math.max(frameShift, Math.hypot(x, y))
              }
            }
            const color = parse(getComputedStyle(el).color)
            let darkest = null
            const x0 = Math.max(0, Math.floor(r.left * scale))
            const x1 = Math.min(canvas.width - 1, Math.ceil(r.right * scale))
            const y0 = Math.max(0, Math.floor(r.top * scale))
            const y1 = Math.min(canvas.height - 1, Math.ceil(r.bottom * scale))
            for (let y = y0; y <= y1; y += 1) {
              for (let x = x0; x <= x1; x += 1) {
                const i = (y * canvas.width + x) * 4
                const a = image[i + 3] / 255
                if (!a) continue
                const px = [0, 1, 2].map((k) => image[i + k] * a + base[k] * (1 - a))
                const c = ratio(color, px)
                if (!darkest || c < darkest) darkest = c
              }
            }
            if (darkest !== null) {
              underFish++
              if (darkest < worst) {
                worst = darkest
                worstText = el.textContent.trim().slice(0, 24)
              }
            }
          }
          if (frameShift > 0) shifted++
          maxShift = Math.max(maxShift, frameShift)
          if (++n < count) requestAnimationFrame(step)
          else resolve({ worst, worstText, maxShift, shifted, underFish, longest })
        }
        requestAnimationFrame(() => requestAnimationFrame(step))
      }),
    { count, scroll },
  )
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
  await page.waitForTimeout(2500)
  const calm = await sample(page, frames, false)
  console.log(
    `     ${viewport}/${scheme} calm (pointer in the margin, no input): words displaced in ${calm.shifted}/${frames} frames, max ${calm.maxShift.toFixed(2)} px; text over fish ink in ${calm.underFish} word-frames`,
  )
  fail(calm.worst < 4.5, `contrast ${viewport}/${scheme} calm: worst ${calm.worst.toFixed(2)}:1 ("${calm.worstText}") over ${frames} frames`)
  let reading
  if (desktop) {
    await lure()
    await page.waitForTimeout(1800)
    await page.mouse.move(column.left + column.width / 2, 420, { steps: 4 })
    reading = await sample(page, frames, false)
    fail(reading.maxShift > 0, `pointer over the column ${viewport}/${scheme}: max displacement ${reading.maxShift.toFixed(2)} px over ${frames} frames (${reading.underFish} word-frames over fish)`)
    fail(reading.worst < 4.5, `contrast ${viewport}/${scheme} reading: worst ${reading.worst.toFixed(2)}:1`)
    await page.mouse.move(margin.x, margin.y)
  }
  await lure()
  await page.waitForTimeout(1800)
  const scrolling = await sample(page, frames, true)
  fail(
    scrolling.maxShift > 0 || scrolling.longest >= 1000,
    `within 1 s of a scroll ${viewport}/${scheme}: max displacement ${scrolling.maxShift.toFixed(2)} px over ${frames} frames, each ≤ ${Math.round(scrolling.longest)} ms after a scroll (${scrolling.underFish} word-frames over fish)`,
  )
  fail(scrolling.worst < 4.5, `contrast ${viewport}/${scheme} scrolling: worst ${scrolling.worst.toFixed(2)}:1`)
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
await checkLinks()
await soak()
await browser.close()
console.log(failed ? 'FAILED' : 'OK')
process.exit(failed ? 1 : 0)
