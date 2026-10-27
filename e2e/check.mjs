import { readFile } from 'node:fs/promises'
import { createRequire } from 'node:module'
import { parseArgs } from 'node:util'
import { chromium } from 'playwright-core'

const { values } = parseArgs({
  options: {
    url: { type: 'string', default: 'http://localhost:4181/' },
    shots: { type: 'string' },
  },
})
const executablePath = process.env.CHROME_PATH
if (!executablePath) throw new Error('Set CHROME_PATH to a Chrome or Chromium binary')

const axeSource = await readFile(createRequire(import.meta.url).resolve('axe-core/axe.min.js'), 'utf8')
const viewports = { desktop: { width: 1440, height: 900 }, phone: { width: 390, height: 844 } }
const browser = await chromium.launch({ executablePath })
let failed = false

async function open(viewport, scheme, reducedMotion) {
  const context = await browser.newContext({
    viewport: viewports[viewport],
    colorScheme: scheme,
    reducedMotion,
    isMobile: viewport === 'phone',
    hasTouch: viewport === 'phone',
  })
  const page = await context.newPage()
  const messages = []
  page.on('console', (m) => ['error', 'warning'].includes(m.type()) && messages.push(`${m.type()}: ${m.text()}`))
  page.on('pageerror', (e) => messages.push(`pageerror: ${e.message}`))
  page.on('requestfailed', (r) => messages.push(`requestfailed: ${r.url()}`))
  await page.goto(values.url, { waitUntil: 'networkidle' })
  return { context, page, messages }
}

async function scrollThrough(page) {
  for (const id of await page.$$eval('main section[id]', (s) => s.map((x) => x.id))) {
    await page.locator(`#${id}`).scrollIntoViewIfNeeded()
    await page.waitForTimeout(250)
  }
  await page.evaluate(async () => {
    for (let y = 0; y <= document.body.scrollHeight; y += 500) {
      window.scrollTo(0, y)
      await new Promise((r) => setTimeout(r, 40))
    }
  })
}

async function audit(viewport, scheme) {
  const { context, page, messages } = await open(viewport, scheme, 'no-preference')
  await scrollThrough(page)
  await page.addScriptTag({ content: axeSource })
  const results = await page.evaluate(() => window.axe.run(document, { resultTypes: ['violations'] }))
  const serious = results.violations.filter((v) => ['serious', 'critical'].includes(v.impact))
  const overflow = await page.evaluate(() => document.documentElement.scrollWidth - window.innerWidth)
  console.log(`axe ${viewport}/${scheme}: ${results.violations.length} violations, ${serious.length} serious/critical`)
  for (const v of results.violations) console.log(`  [${v.impact}] ${v.id}: ${v.nodes.length} node(s) ${v.nodes[0]?.target}`)
  console.log(`console ${viewport}/${scheme}: ${messages.length ? messages.join(' | ') : 'clean'}`)
  console.log(`horizontal overflow ${viewport}/${scheme}: ${overflow}px`)
  if (serious.length || messages.length || overflow > 0) failed = true
  await context.close()
}

async function checkLinks() {
  const { context, page } = await open('desktop', 'light', 'no-preference')
  const targets = await page.evaluate(() => [
    ...new Set([
      ...[...document.querySelectorAll('a[href], link[href]')].map((a) => a.getAttribute('href')),
      ...[...document.querySelectorAll('img[src], script[src]')].map((s) => s.getAttribute('src')),
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
    if (href.startsWith('#')) {
      const found = (await page.locator(href).count()) > 0
      console.log(`link ${found ? 'anchor ok' : 'ANCHOR MISSING'} ${href}`)
      if (!found) failed = true
      continue
    }
    const url = new URL(href.replace('https://tungcodeforfun.github.io/', values.url), values.url)
    const response = await fetch(url, { redirect: 'follow', headers: { 'user-agent': 'Mozilla/5.0 link-check' } })
    console.log(`link ${response.status} ${href}${url.href !== href ? ` (checked ${url.href})` : ''}`)
    if (response.status !== 200) failed = true
  }
  await context.close()
}

async function shots(dir) {
  for (const viewport of Object.keys(viewports)) {
    for (const scheme of ['light', 'dark']) {
      for (const reducedMotion of ['no-preference', 'reduce']) {
        const { context, page } = await open(viewport, scheme, reducedMotion)
        const name = `${dir}/site-${viewports[viewport].width}-${scheme}-${reducedMotion === 'reduce' ? 'rm' : 'motion'}`
        await page.waitForTimeout(1500)
        await page.screenshot({ path: `${name}-first.png` })
        await scrollThrough(page)
        await page.evaluate(() => window.scrollTo(0, 0))
        await page.waitForTimeout(500)
        await page.screenshot({ path: `${name}-full.png`, fullPage: true })
        console.log(`shot ${name}-{first,full}.png`)
        await context.close()
      }
    }
  }
}

for (const viewport of Object.keys(viewports)) for (const scheme of ['light', 'dark']) await audit(viewport, scheme)
await checkLinks()
if (values.shots) await shots(values.shots)
await browser.close()
console.log(failed ? 'FAILED' : 'OK')
process.exit(failed ? 1 : 0)
