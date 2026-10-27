import { mkdir, rename, writeFile } from 'node:fs/promises'
import { parseArgs } from 'node:util'
import { chromium } from 'playwright-core'

const { values } = parseArgs({
  options: {
    url: { type: 'string', default: 'http://localhost:4181/' },
    out: { type: 'string' },
    only: { type: 'string', default: 'shots,sims,video,frames,fallback' },
  },
})
const executablePath = process.env.CHROME_PATH
if (!executablePath) throw new Error('Set CHROME_PATH to a Chrome or Chromium binary')
if (!values.out) throw new Error('Pass --out <dir>')
await mkdir(values.out, { recursive: true })
const only = new Set(values.only.split(','))
const viewports = { 1440: { width: 1440, height: 900 }, 390: { width: 390, height: 844 } }
const browser = await chromium.launch({ executablePath, args: ['--use-angle=swiftshader', '--enable-unsafe-swiftshader'] })
const problems = []

async function open(width, scheme, reducedMotion, extra = {}) {
  const context = await browser.newContext({
    viewport: viewports[width],
    colorScheme: scheme,
    reducedMotion,
    isMobile: width === 390,
    hasTouch: width === 390,
    ...extra,
  })
  const page = await context.newPage()
  page.on('console', (m) => ['error', 'warning'].includes(m.type()) && problems.push(`${width}/${scheme}: ${m.type()} ${m.text()}`))
  page.on('pageerror', (e) => problems.push(`${width}/${scheme}: pageerror ${e.message}`))
  await page.goto(values.url, { waitUntil: 'networkidle' })
  return { context, page }
}

async function settle(page, ms) {
  await page.waitForTimeout(ms)
}

async function fullPage(page, path) {
  const { height, total } = await page.evaluate(() => ({ height: innerHeight, total: document.documentElement.scrollHeight }))
  const tiles = []
  for (let y = 0; y < total; y += height) {
    const top = Math.min(y, total - height)
    await page.evaluate((t) => window.scrollTo(0, t), top)
    await settle(page, 700)
    tiles.push({ y, offset: y - top, data: (await page.screenshot()).toString('base64') })
    if (y === 0) await page.addStyleTag({ content: '.topbar{visibility:hidden!important}' })
  }
  const composer = await page.context().newPage()
  const png = await composer.evaluate(
    async ({ tiles, total, height }) => {
      const images = await Promise.all(
        tiles.map(async (t) => ({ ...t, bitmap: await createImageBitmap(await (await fetch(`data:image/png;base64,${t.data}`)).blob()) })),
      )
      const scale = images[0].bitmap.height / height
      const canvas = new OffscreenCanvas(images[0].bitmap.width, Math.round(total * scale))
      const g = canvas.getContext('2d')
      for (const t of images) g.drawImage(t.bitmap, 0, t.offset * scale, t.bitmap.width, (height - t.offset) * scale, 0, t.y * scale, t.bitmap.width, (height - t.offset) * scale)
      const blob = await canvas.convertToBlob({ type: 'image/png' })
      return [...new Uint8Array(await blob.arrayBuffer())]
    },
    { tiles, total, height },
  )
  await composer.close()
  await writeFile(path, Buffer.from(png))
}

async function shots() {
  for (const width of [1440, 390]) {
    for (const scheme of ['dark', 'light']) {
      for (const rm of ['no-preference', 'reduce']) {
        const { context, page } = await open(width, scheme, rm)
        const name = `${values.out}/site-${width}-${scheme}-${rm === 'reduce' ? 'rm' : 'motion'}`
        await settle(page, 6000)
        await page.screenshot({ path: `${name}-first.png` })
        await page.addStyleTag({ content: '*{animation-timeline:auto!important;animation:none!important}' })
        await fullPage(page, `${name}-full.png`)
        console.log(`shot ${name}-{first,full}.png`)
        await context.close()
      }
    }
  }
}

async function scrollToSim(page, id) {
  const figure = page.locator(`.sim[data-sim="${id}"]`)
  await figure.scrollIntoViewIfNeeded()
  await page.evaluate((sel) => {
    const el = document.querySelector(sel)
    window.scrollBy(0, el.getBoundingClientRect().top - 90)
  }, `.sim[data-sim="${id}"]`)
  await page.waitForSelector(`.sim[data-sim="${id}"][data-live]`, { state: 'attached' })
  return figure
}

async function hover(page, figure, fx, fy) {
  const box = await figure.locator('canvas').boundingBox()
  await page.mouse.move(box.x + box.width * fx, box.y + box.height * fy, { steps: 6 })
}

async function readout(figure) {
  return (await figure.locator('.sim__readout').textContent()).trim()
}

const scripts = {
  async queue(page, figure, width, scheme) {
    await figure.getByRole('button', { name: 'Inject a poisoned message' }).click()
    await settle(page, 2600)
    await figure.screenshot({ path: `${values.out}/sim-queue-${width}-${scheme}-retrying.png` })
    await page.waitForFunction(
      () => document.querySelector('.sim[data-sim="queue"] .sim__readout').textContent.includes('moved to the dead-letter queue'),
      null,
      { timeout: 40000 },
    )
    await settle(page, 600)
    if (width === 1440) await hover(page, figure, 0.32, 0.78)
    await figure.screenshot({ path: `${values.out}/sim-queue-${width}-${scheme}-dead-lettered.png` })
    console.log(`queue ${width}/${scheme}: ${await readout(figure)}`)
    await figure.getByRole('radio', { name: 'Synchronous HTTP' }).check()
    await settle(page, 400)
    await figure.getByRole('button', { name: 'Send a batch' }).click()
    await settle(page, 6500)
    await figure.screenshot({ path: `${values.out}/sim-queue-${width}-${scheme}-sync-timeouts.png` })
    console.log(`queue sync ${width}/${scheme}: ${await readout(figure)}`)
    await figure.getByRole('radio', { name: 'SQS batches' }).check()
  },
  async menu(page, figure, width, scheme) {
    const slider = figure.locator('input[type="range"]')
    const box = await slider.boundingBox()
    await page.mouse.move(box.x + 12, box.y + box.height / 2)
    await page.mouse.down()
    await page.mouse.move(box.x + box.width * 0.55, box.y + box.height / 2, { steps: 12 })
    await settle(page, 1200)
    await figure.screenshot({ path: `${values.out}/sim-menu-${width}-${scheme}-dragging.png` })
    await page.mouse.move(box.x + box.width - 4, box.y + box.height / 2, { steps: 12 })
    await page.mouse.up()
    await settle(page, 3500)
    await figure.getByRole('radio', { name: 'Venue B' }).check()
    await settle(page, 2000)
    if (width === 1440) await hover(page, figure, 0.5, 0.5)
    await figure.screenshot({ path: `${values.out}/sim-menu-${width}-${scheme}-narrowed.png` })
    console.log(`menu ${width}/${scheme}: ${await readout(figure)}`)
    await figure.getByRole('button', { name: 'Run the backfill' }).click()
    await settle(page, 4000)
    await figure.getByRole('button', { name: 'Run the backfill' }).click()
    await settle(page, 4000)
    console.log(`menu backfill ${width}/${scheme}: ${await readout(figure)}`)
  },
  async cache(page, figure, width, scheme) {
    await settle(page, 1500)
    await figure.screenshot({ path: `${values.out}/sim-cache-${width}-${scheme}-on.png` })
    await figure.getByRole('button', { name: 'Redis cache' }).click()
    await settle(page, 9000)
    if (width === 1440) await hover(page, figure, 0.7, 0.82)
    await figure.screenshot({ path: `${values.out}/sim-cache-${width}-${scheme}-off.png` })
    console.log(`cache off ${width}/${scheme}: ${await readout(figure)}`)
    await figure.getByRole('button', { name: 'Redis cache' }).click()
    await settle(page, 9000)
    console.log(`cache on ${width}/${scheme}: ${await readout(figure)}`)
  },
  async match(page, figure, width, scheme) {
    await figure.getByRole('button', { name: 'Feed an ambiguous record' }).click()
    await figure.getByRole('button', { name: 'Feed 12 records' }).click()
    await settle(page, 4000)
    await figure.screenshot({ path: `${values.out}/sim-match-${width}-${scheme}-matching.png` })
    await settle(page, 9000)
    await figure.screenshot({ path: `${values.out}/sim-match-${width}-${scheme}-review.png` })
    console.log(`match ${width}/${scheme}: ${await readout(figure)}`)
  },
}

async function sims() {
  for (const width of [1440, 390]) {
    for (const scheme of ['dark', 'light']) {
      const { context, page } = await open(width, scheme, 'no-preference')
      for (const id of Object.keys(scripts)) {
        const figure = await scrollToSim(page, id)
        await settle(page, 800)
        await scripts[id](page, figure, width, scheme)
      }
      await context.close()
    }
  }
  const { context, page } = await open(1440, 'dark', 'no-preference')
  const figure = await scrollToSim(page, 'queue')
  await figure.locator('[data-action="poison"]').focus()
  await page.keyboard.press('Enter')
  await page.keyboard.press('Shift+Tab')
  await page.keyboard.press('Shift+Tab')
  await page.keyboard.press('ArrowRight')
  await settle(page, 600)
  await figure.screenshot({ path: `${values.out}/sim-queue-1440-dark-keyboard-focus.png` })
  console.log(`keyboard queue: ${await readout(figure)}`)
  await context.close()
}

async function video() {
  for (const [name, setup] of [
    ['hero', async (page) => {
      await settle(page, 7000)
      for (let y = 0; y <= 900; y += 30) {
        await page.mouse.wheel(0, 30)
        await settle(page, 60)
      }
      await settle(page, 2500)
      for (let y = 900; y >= 0; y -= 60) {
        await page.mouse.wheel(0, -60)
        await settle(page, 40)
      }
      await settle(page, 2000)
    }],
    ['sim-queue', async (page) => {
      const figure = await scrollToSim(page, 'queue')
      await settle(page, 1500)
      await figure.getByRole('button', { name: 'Inject a poisoned message' }).click()
      await settle(page, 11000)
      await figure.getByRole('radio', { name: 'Synchronous HTTP' }).check()
      await figure.getByRole('button', { name: 'Send a batch' }).click()
      await settle(page, 7000)
    }],
    ['sim-cache', async (page) => {
      const figure = await scrollToSim(page, 'cache')
      await settle(page, 2000)
      await figure.getByRole('button', { name: 'Redis cache' }).click()
      await settle(page, 9000)
      await figure.getByRole('button', { name: 'Redis cache' }).click()
      await settle(page, 9000)
    }],
  ]) {
    const { context, page } = await open(1440, 'dark', 'no-preference', {
      recordVideo: { dir: values.out, size: { width: 1440, height: 900 } },
    })
    await setup(page)
    const path = await page.video().path()
    await context.close()
    await rename(path, `${values.out}/${name}.webm`)
    console.log(`video ${values.out}/${name}.webm`)
  }
}

async function frames() {
  const context = await browser.newContext({ viewport: viewports[1440], colorScheme: 'dark' })
  await context.addInitScript(() => {
    window.__cost = []
    const raf = window.requestAnimationFrame.bind(window)
    window.requestAnimationFrame = (fn) =>
      raf((t) => {
        const start = performance.now()
        fn(t)
        window.__cost.push(performance.now() - start)
      })
  })
  const page = await context.newPage()
  await page.goto(values.url, { waitUntil: 'networkidle' })
  await page.waitForSelector('.hero[data-live]', { state: 'attached', timeout: 30000 })
  await settle(page, 2000)
  await page.evaluate(() => (window.__cost.length = 0))
  const stats = await page.evaluate(
    () =>
      new Promise((resolve) => {
        const deltas = []
        let last = performance.now()
        const tick = (now) => {
          deltas.push(now - last)
          last = now
          if (deltas.length < 400) requestAnimationFrame(tick)
          else {
            const s = deltas.slice(10).sort((a, b) => a - b)
            const at = (q) => s[Math.min(s.length - 1, Math.floor(q * s.length))]
            resolve({ frames: s.length, p50: at(0.5), p95: at(0.95), fps: 1000 / at(0.5) })
          }
        }
        requestAnimationFrame(tick)
      }),
  )
  console.log(`frames hero 1440 dark: ${JSON.stringify(stats)}`)
  const cost = await page.evaluate(() => {
    const s = window.__cost.filter((v) => v > 0.05).sort((a, b) => a - b)
    const at = (q) => s[Math.min(s.length - 1, Math.floor(q * s.length))]
    return { callbacks: s.length, p50: at(0.5), p95: at(0.95) }
  })
  console.log(`hero main-thread work per frame (rAF callbacks, ms): ${JSON.stringify(cost)}`)
  const offscreen = await page.evaluate(async () => {
    window.scrollTo(0, document.querySelector('#experience').offsetTop)
    await new Promise((r) => setTimeout(r, 600))
    const canvas = document.querySelector('.hero canvas')
    const gl = canvas.getContext('webgl2')
    let draws = 0
    const original = gl.drawArrays.bind(gl)
    gl.drawArrays = (...args) => {
      draws++
      return original(...args)
    }
    await new Promise((r) => setTimeout(r, 1500))
    return draws
  })
  console.log(`hero draw calls in 1.5 s while scrolled away: ${offscreen}`)
  await context.close()
}

async function fallback() {
  const context = await browser.newContext({ viewport: viewports[1440], colorScheme: 'dark' })
  await context.addInitScript(() => {
    HTMLCanvasElement.prototype.getContext = new Proxy(HTMLCanvasElement.prototype.getContext, {
      apply(target, self, args) {
        return String(args[0]).startsWith('webgl') ? null : Reflect.apply(target, self, args)
      },
    })
  })
  const page = await context.newPage()
  page.on('pageerror', (e) => problems.push(`fallback: pageerror ${e.message}`))
  await page.goto(values.url, { waitUntil: 'networkidle' })
  await settle(page, 4000)
  const state = await page.evaluate(() => ({
    canvases: document.querySelectorAll('.hero canvas').length,
    cached: localStorage.getItem('webgl'),
    still: getComputedStyle(document.querySelector('.hero__still')).backgroundImage,
  }))
  await page.screenshot({ path: `${values.out}/site-1440-dark-webgl-fallback.png` })
  console.log(`fallback: ${JSON.stringify(state)}`)
  await context.close()
}

if (only.has('shots')) await shots()
if (only.has('sims')) await sims()
if (only.has('video')) await video()
if (only.has('frames')) await frames()
if (only.has('fallback')) await fallback()
await browser.close()
console.log(problems.length ? `PROBLEMS\n${problems.join('\n')}` : 'console clean')
process.exit(problems.length ? 1 : 0)
