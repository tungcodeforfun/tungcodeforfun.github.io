import { readFile } from 'node:fs/promises'
import { createRequire } from 'node:module'
import { parseArgs } from 'node:util'
import { chromium } from 'playwright-core'

const { values } = parseArgs({
  options: {
    url: { type: 'string', default: 'http://localhost:4185/' },
    soak: { type: 'string', default: '60' },
  },
})
const executablePath = process.env.CHROME_PATH
if (!executablePath) throw new Error('Set CHROME_PATH to a Chrome or Chromium binary')

const axeSource = await readFile(createRequire(import.meta.url).resolve('axe-core/axe.min.js'), 'utf8')
const viewports = { desktop: { width: 1440, height: 900 }, phone: { width: 390, height: 844 } }
const browser = await chromium.launch({ executablePath })
let failed = false

async function open(viewport, scheme) {
  const context = await browser.newContext({
    viewport: viewports[viewport],
    colorScheme: scheme,
    isMobile: viewport === 'phone',
    hasTouch: viewport === 'phone',
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

async function inkUnderCard(page) {
  return page.evaluate(() => {
    const canvas = document.querySelector('.pond canvas')
    const box = document.querySelector('.card').getBoundingClientRect()
    const scale = canvas.width / canvas.clientWidth
    const [x, y, w, h] = [box.left, box.top, box.width, box.height].map((v) => Math.round(v * scale))
    const copy = document.createElement('canvas')
    copy.width = w
    copy.height = h
    const ctx = copy.getContext('2d', { willReadFrequently: true })
    ctx.drawImage(canvas, x, y, w, h, 0, 0, w, h)
    const data = ctx.getImageData(0, 0, w, h).data
    let inked = 0
    for (let i = 3; i < data.length; i += 4) if (data[i]) inked++
    return inked
  })
}

async function audit(viewport, scheme) {
  const { context, page, messages } = await open(viewport, scheme)
  let under = 0
  for (let i = 0; i < 20; i++) {
    under += await inkUnderCard(page)
    await page.waitForTimeout(250)
  }
  await page.addScriptTag({ content: axeSource })
  const results = await page.evaluate(() => window.axe.run(document, { resultTypes: ['violations'] }))
  const serious = results.violations.filter((v) => ['serious', 'critical'].includes(v.impact))
  const overflow = await page.evaluate(() => ({
    x: document.documentElement.scrollWidth - window.innerWidth,
    y: document.documentElement.scrollHeight - window.innerHeight,
  }))
  console.log(`axe ${viewport}/${scheme}: ${results.violations.length} violations, ${serious.length} serious/critical`)
  for (const v of results.violations) console.log(`  [${v.impact}] ${v.id}: ${v.nodes.length} node(s) ${v.nodes[0]?.target}`)
  console.log(`console ${viewport}/${scheme}: ${messages.length ? messages.join(' | ') : 'clean'}`)
  console.log(`overflow ${viewport}/${scheme}: ${overflow.x}px x, ${overflow.y}px y`)
  console.log(`glyph pixels under the text block ${viewport}/${scheme}: ${under} (20 samples over 5 s)`)
  if (serious.length || messages.length || overflow.x > 0 || overflow.y > 0 || under > 0) failed = true
  await context.close()
}

async function soak() {
  const { context, page, messages } = await open('desktop', 'dark')
  const seconds = Number(values.soak)
  for (let s = 0; s < seconds; s++) {
    if (s % 10 === 3) await page.mouse.click(300 + s * 13, 200 + (s % 7) * 40)
    await page.mouse.move(400 + Math.sin(s) * 200, 300 + Math.cos(s) * 150, { steps: 6 })
    await page.waitForTimeout(1000)
  }
  console.log(`console after ${seconds} s of swimming, clicks and pointer moves: ${messages.length ? messages.join(' | ') : 'clean'}`)
  if (messages.length) failed = true
  await context.close()
}

async function checkLinks() {
  const { context, page } = await open('desktop', 'light')
  const targets = await page.evaluate(() => [
    ...new Set([
      ...[...document.querySelectorAll('a[href], link[href]')].map((a) => a.getAttribute('href')),
      ...[...document.querySelectorAll('script[src]')].map((s) => s.getAttribute('src')),
      ...[...document.querySelectorAll('meta[property="og:image"], meta[name="twitter:image"]')].map((m) =>
        m.getAttribute('content'),
      ),
    ]),
  ])
  for (const href of targets) {
    if (href.startsWith('mailto:')) {
      console.log(`link mailto ${href}`)
      continue
    }
    const url = new URL(href.replace('https://tungcodeforfun.github.io/', values.url), values.url)
    const response = await fetch(url, { redirect: 'follow', headers: { 'user-agent': 'Mozilla/5.0 link-check' } })
    const bot = response.status === 999 && url.hostname.endsWith('linkedin.com')
    console.log(`link ${response.status}${bot ? ' (LinkedIn refuses bots)' : ''} ${href}${url.href !== href ? ` (checked ${url.href})` : ''}`)
    if (response.status !== 200 && !bot) failed = true
  }
  await context.close()
}

for (const viewport of Object.keys(viewports)) for (const scheme of ['light', 'dark']) await audit(viewport, scheme)
await checkLinks()
await soak()
await browser.close()
console.log(failed ? 'FAILED' : 'OK')
process.exit(failed ? 1 : 0)
