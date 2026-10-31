import { execSync } from 'node:child_process'
import { intro, links, log, profile, projects, titles, years, type Prose } from './content.ts'
import { cells, createPond } from './koi/pond.ts'

const FILLER =
  'lorem ipsum dolor sit amet consectetur adipiscing elit sed do eiusmod tempor incididunt ut labore et dolore magna aliqua ut enim ad minim veniam quis nostrud exercitation ullamco laboris nisi ut aliquip ex ea commodo consequat duis aute irure dolor in reprehenderit in voluptate velit esse cillum dolore eu fugiat nulla pariatur excepteur sint occaecat cupidatat non proident sunt in culpa qui officia deserunt mollit anim id est laborum'.split(
    ' ',
  )

const escape = (s: string) => s.replaceAll('&', '&amp;').replaceAll('"', '&quot;').replaceAll('<', '&lt;').replaceAll('>', '&gt;')

function words(text: string) {
  return text.replace(/[ \t\r\n]+/g, ' ').replace(/[^ ]+/g, (w) => `<span class="w">${escape(w)}</span>`)
}

function rich(text: string) {
  let html = ''
  let last = 0
  for (const m of text.matchAll(/\[([^\]]+)\]\(([^)\s]+)\)/g)) {
    html += `${words(text.slice(last, m.index))}<a href="${escape(m[2])}">${words(m[1])}</a>`
    last = m.index + m[0].length
  }
  return (html + words(text.slice(last))).trim()
}

function prose(p: Prose, offset = 0) {
  if (p.text) return `<p>${rich(p.text)}</p>`
  const label = `${p.label}: Tung writes this, about ${p.words} words.`
  const fill = Array.from({ length: Math.max(0, p.words - label.split(' ').length) }, (_, i) => FILLER[(i + offset) % FILLER.length]).join(' ')
  return `<p class="ph" data-placeholder="${p.key}"><span class="ph-label">${words(label)}</span> ${words(fill)}</p>`
}

function link(name: string, href?: string) {
  return href ? `<a href="${escape(href)}">${words(name)}</a>` : words(name)
}

export function commit() {
  const fromCi = process.env.GITHUB_SHA?.slice(0, 7)
  if (fromCi) return fromCi
  try {
    return execSync('git rev-parse --short=7 HEAD', { encoding: 'utf8' }).trim()
  } catch {
    return 'unknown'
  }
}

function personJsonLd() {
  return JSON.stringify({
    '@context': 'https://schema.org',
    '@type': 'Person',
    name: profile.name,
    jobTitle: profile.role,
    worksFor: { '@type': 'Organization', name: profile.company },
    address: { '@type': 'PostalAddress', addressLocality: profile.city },
    email: `mailto:${profile.email}`,
    url: profile.site,
    sameAs: [profile.github, profile.linkedin],
    alumniOf: { '@type': 'CollegeOrUniversity', name: 'Virginia Tech' },
  }).replaceAll('<', '\\u003c')
}

function head() {
  const image = `${profile.site}og.png`
  const meta = [
    ['name', 'description', profile.description],
    ['property', 'og:type', 'profile'],
    ['property', 'og:url', profile.site],
    ['property', 'og:title', profile.title],
    ['property', 'og:description', profile.description],
    ['property', 'og:image', image],
    ['property', 'og:image:width', '1200'],
    ['property', 'og:image:height', '630'],
    ['property', 'og:image:alt', `Two koi drawn in text symbols above the name ${profile.name}, ${profile.role} at ${profile.company}, ${profile.city}`],
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

function still(name: string, width: number, height: number, length: number, share: number) {
  const { fontSize, cellW, cellH } = cells(length)
  const pond = createPond()
  pond.setLayout({ width, height, length, cellW, cellH })
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
    lines.push(line.replace(/ +(?=(<\/span>)?$)/, ''))
  }
  const font = (share * 100) / grid.cols / (cellW / fontSize)
  return `<pre class="still still--${name}" style="font-size:${font.toFixed(4)}vw;line-height:${(cellH / fontSize).toFixed(4)}">${lines.join('\n')}</pre>`
}

function body(sha: string) {
  const contact = links.map(({ label, href }) => `<li><a href="${escape(href)}">${escape(label)}</a></li>`).join('')
  const rows = log.map((r) => `<li><span class="date">${words(r.date)}</span><span>${link(r.name, r.href)}</span></li>`).join('')
  const work = projects
    .map((p, i) => `<div class="entry"><p>${link(p.name, p.href)} <span class="quiet">${words(p.status)}</span></p>${prose(p.line, i * 17)}</div>`)
    .join('')
  const story = years.entries.map((y, i) => `<div class="entry"><p class="quiet">${words(y.year)}</p>${prose(y.story, i * 23 + 5)}</div>`).join('')
  const nav = [['intro', 'Intro'], ['log', titles.log], ['projects', titles.projects], ['years', titles.years]]
    .map(([id, title]) => `<a href="#${id}">${escape(title)}</a>`)
    .join('')
  return [
    '<div class="pond" aria-hidden="true">',
    still('wide', 360, 600, 210, 0.25),
    still('narrow', 390, 320, 150, 1),
    '<canvas></canvas>',
    '</div>',
    '<div class="page">',
    '<main>',
    '<section id="intro" aria-labelledby="name">',
    `<h1 id="name">${escape(profile.name)}</h1>`,
    `<p class="role">${escape(`${profile.role} at ${profile.company}, ${profile.city}`)}</p>`,
    `<ul class="contact">${contact}</ul>`,
    `<div class="flow">${intro.map((p, i) => prose(p, i * 11)).join('')}</div>`,
    '</section>',
    `<section id="log" aria-labelledby="log-title"><h2 id="log-title">${escape(titles.log)}</h2><ol class="log">${rows}</ol></section>`,
    `<section id="projects" aria-labelledby="projects-title"><h2 id="projects-title">${escape(titles.projects)}</h2>${work}</section>`,
    `<section id="years" aria-labelledby="years-title"><h2 id="years-title">${escape(titles.years)}</h2>${prose(years.summary, 40)}${story}</section>`,
    '</main>',
    '<aside class="side">',
    `<p class="clock" data-zone="${profile.timeZone}"><span>${escape(profile.city)}</span> <span class="time"></span></p>`,
    `<nav aria-label="Sections">${nav}<a class="top" href="#intro">Top</a></nav>`,
    '</aside>',
    `<footer class="colophon"><span>${escape(profile.name)}</span> <a class="sha" href="${profile.repo}/commit/${sha}" title="The commit this page was built from">${sha}</a></footer>`,
    '</div>',
  ].join('\n')
}

export function render() {
  return { head: head(), body: body(commit()) }
}
