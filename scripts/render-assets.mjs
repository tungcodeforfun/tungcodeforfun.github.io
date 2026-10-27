import { mkdir, readFile, writeFile } from 'node:fs/promises'
import { fileURLToPath } from 'node:url'
import { parseArgs } from 'node:util'
import { chromium } from 'playwright-core'

const root = fileURLToPath(new URL('..', import.meta.url))
const executablePath = process.env.CHROME_PATH
if (!executablePath) throw new Error('Set CHROME_PATH to a Chrome or Chromium binary')
const { values } = parseArgs({ options: { stills: { type: 'string' } } })

function ico(png) {
  const header = Buffer.alloc(22)
  header.writeUInt16LE(1, 2)
  header.writeUInt16LE(1, 4)
  header.writeUInt8(32, 6)
  header.writeUInt8(32, 7)
  header.writeUInt16LE(1, 10)
  header.writeUInt16LE(32, 12)
  header.writeUInt32LE(png.length, 14)
  header.writeUInt32LE(22, 18)
  return Buffer.concat([header, png])
}

async function webp(page, png, quality = 0.82) {
  const bytes = await page.evaluate(
    async ({ data, quality }) => {
      const bitmap = await createImageBitmap(await (await fetch(`data:image/png;base64,${data}`)).blob())
      const canvas = new OffscreenCanvas(bitmap.width, bitmap.height)
      canvas.getContext('2d').drawImage(bitmap, 0, 0)
      const blob = await canvas.convertToBlob({ type: 'image/webp', quality })
      return [...new Uint8Array(await blob.arrayBuffer())]
    },
    { data: png.toString('base64'), quality },
  )
  return Buffer.from(bytes)
}

const hideOverlays = `
  .hero__scrim, .hero__copy, .hero__scene, .topbar, .sim__still, .sim__stage::after { visibility: hidden !important; }
  .sim__stage { box-shadow: none !important; }
`

async function renderStills(browser, url) {
  await mkdir(`${root}public/stills`, { recursive: true })
  const sizes = [
    ['wide', { width: 1440, height: 900 }, 1],
    ['narrow', { width: 390, height: 844 }, 2],
  ]
  for (const theme of ['light', 'dark']) {
    for (const [label, viewport, deviceScaleFactor] of sizes) {
      const context = await browser.newContext({
        viewport,
        deviceScaleFactor,
        colorScheme: theme,
        isMobile: label === 'narrow',
        hasTouch: label === 'narrow',
      })
      const page = await context.newPage()
      await page.goto(`${url}?still`, { waitUntil: 'networkidle' })
      await page.addStyleTag({ content: hideOverlays })
      await page.evaluate(() => document.fonts.ready)
      await page.waitForSelector('.hero[data-still-ready]', { state: 'attached', timeout: 30000 })
      const hero = await page.locator('.hero__stage').screenshot()
      await writeFile(`${root}public/stills/hero-${theme}-${label}.webp`, await webp(page, hero, 0.8))
      for (const id of await page.$$eval('.sim[data-sim]', (els) => els.map((el) => el.dataset.sim))) {
        const figure = page.locator(`.sim[data-sim="${id}"]`)
        await figure.scrollIntoViewIfNeeded()
        await page.waitForSelector(`.sim[data-sim="${id}"][data-still-ready]`, { state: 'attached', timeout: 30000 })
        const shot = await figure.locator('.sim__stage').screenshot({ omitBackground: false })
        await writeFile(`${root}public/stills/sim-${id}-${theme}-${label}.webp`, await webp(page, shot))
      }
      console.log(`stills ${theme} ${label}`)
      await context.close()
    }
  }
}

const browser = await chromium.launch({ executablePath })
if (values.stills) {
  await renderStills(browser, values.stills)
} else {
  const page = await browser.newPage({ viewport: { width: 1200, height: 630 } })
  await page.goto(`file://${root}scripts/og.html`)
  await page.evaluate(() => document.fonts.ready)
  await page.waitForTimeout(300)
  await writeFile(`${root}public/og.png`, await page.screenshot())

  const svg = await readFile(`${root}public/favicon.svg`, 'utf8')
  for (const [size, name] of [[32, null], [180, 'apple-touch-icon.png'], [192, 'icon-192.png'], [512, 'icon-512.png']]) {
    await page.setViewportSize({ width: size, height: size })
    await page.setContent(`<style>*{margin:0}svg{display:block;width:${size}px;height:${size}px}</style>${svg}`)
    const png = await page.screenshot({ omitBackground: true })
    await writeFile(`${root}public/${name ?? 'favicon.ico'}`, name ? png : ico(png))
  }
}
await browser.close()
