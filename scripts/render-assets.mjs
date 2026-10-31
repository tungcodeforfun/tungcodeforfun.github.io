import { readFile, writeFile } from 'node:fs/promises'
import { fileURLToPath } from 'node:url'
import { parseArgs } from 'node:util'
import { chromium } from 'playwright-core'
import { still } from '../src/render.ts'

const root = fileURLToPath(new URL('..', import.meta.url))
const executablePath = process.env.CHROME_PATH
if (!executablePath) throw new Error('Set CHROME_PATH to a Chrome or Chromium binary')
const { values } = parseArgs({
  options: {
    url: { type: 'string', default: 'http://localhost:4185/' },
  },
})

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

const browser = await chromium.launch({ executablePath })

const og = await browser.newContext({ viewport: { width: 1200, height: 630 }, colorScheme: 'light', deviceScaleFactor: 1, javaScriptEnabled: false })
const page = await og.newPage()
await page.goto(values.url, { waitUntil: 'networkidle' })
const style =
  '<style>html { font-size: 32px } .still--wide { display: none } .still--og { top: 14px } .page { display: block } main { padding: 482px 64px 0 } main > section { max-width: none } .contact, .flow, main > section + section, .side, .colophon { display: none }</style>'
await page.evaluate((html) => document.querySelector('.pond').insertAdjacentHTML('beforeend', html), style + still('og', 1200, 450, 440, 1))
await writeFile(`${root}public/og.png`, await page.screenshot())
await og.close()

const icons = await browser.newPage()
const svg = await readFile(`${root}public/favicon.svg`, 'utf8')
for (const [size, name] of [[32, null], [180, 'apple-touch-icon.png'], [192, 'icon-192.png'], [512, 'icon-512.png']]) {
  await icons.setViewportSize({ width: size, height: size })
  await icons.setContent(`<style>*{margin:0}svg{display:block;width:${size}px;height:${size}px}</style>${svg}`)
  const png = await icons.screenshot({ omitBackground: true })
  await writeFile(`${root}public/${name ?? 'favicon.ico'}`, name ? png : ico(png))
}
await browser.close()
