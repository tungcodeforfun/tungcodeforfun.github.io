import { links, profile } from './content.ts'
import { createPond, metrics, type Rect } from './koi/pond.ts'

const escape = (s: string) => s.replace(/&/g, '&amp;').replace(/"/g, '&quot;').replace(/</g, '&lt;').replace(/>/g, '&gt;')

function personJsonLd() {
  return JSON.stringify({
    '@context': 'https://schema.org',
    '@type': 'Person',
    name: profile.name,
    jobTitle: profile.role,
    url: profile.site,
    sameAs: [profile.github, profile.linkedin],
  }).replace(/</g, '\\u003c')
}

function head() {
  const image = `${profile.site}og.png`
  const meta = [
    ['name', 'description', profile.description],
    ['property', 'og:type', 'website'],
    ['property', 'og:url', profile.site],
    ['property', 'og:title', profile.title],
    ['property', 'og:description', profile.description],
    ['property', 'og:image', image],
    ['property', 'og:image:width', '1200'],
    ['property', 'og:image:height', '630'],
    ['property', 'og:image:alt', `Two koi drawn in text symbols, and the name ${profile.name}`],
    ['name', 'twitter:card', 'summary_large_image'],
    ['name', 'twitter:title', profile.title],
    ['name', 'twitter:description', profile.description],
    ['name', 'twitter:image', image],
  ]
  return [
    `<title>${escape(profile.title)}</title>`,
    `<link rel="canonical" href="${profile.site}" />`,
    ...meta.map(([attr, key, value]) => `<meta ${attr}="${key}" content="${escape(value)}" />`),
    `<script type="application/ld+json">${personJsonLd()}</script>`,
  ].join('\n    ')
}

function still(name: string, width: number, height: number, keepOut: Rect) {
  const { cellW, cellH } = metrics(width, height)
  const pond = createPond()
  pond.setLayout({ width, height, cellW, cellH, keepOut })
  for (let i = 0; i < 60 * 14; i++) pond.step(1 / 60)
  const grid = pond.paint()
  const lines: string[] = []
  for (let r = 0; r < grid.rows; r++) {
    let line = ''
    let open = ''
    for (let c = 0; c < grid.cols; c++) {
      const i = r * grid.cols + c
      const ink = grid.ink[i]
      const style = ink ? `k${ink}${grid.alpha[i] < 160 ? ' f' : ''}` : ''
      if (style && style !== open) {
        if (open) line += '</span>'
        line += `<span class="${style}">`
        open = style
      }
      line += ink ? escape(String.fromCharCode(grid.glyph[i])) : ' '
    }
    if (open) line += '</span>'
    lines.push(line.replace(/ +$/, ''))
  }
  return `<pre class="still still--${name}" aria-hidden="true">${lines.join('\n')}</pre>`
}

function body() {
  const items = links.map(({ label, href }) => `<li><a href="${escape(href)}">${escape(label)}</a></li>`).join('')
  return [
    '<main>',
    `<div class="pond" role="img" aria-label="Two koi, drawn in text symbols, swimming around each other">`,
    still('wide', 1440, 900, { x: 32, y: 660, w: 470, h: 208 }),
    still('narrow', 390, 844, { x: 12, y: 664, w: 366, h: 168 }),
    '<canvas aria-hidden="true"></canvas>',
    '</div>',
    '<div class="card">',
    `<h1>${escape(profile.name)}</h1>`,
    `<p>${escape(`${profile.role}, ${profile.location}`)}</p>`,
    `<ul>${items}</ul>`,
    '</div>',
    '</main>',
  ].join('\n')
}

export function render() {
  return { head: head(), body: body() }
}
