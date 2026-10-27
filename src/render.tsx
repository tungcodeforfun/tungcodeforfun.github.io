import { renderToStaticMarkup } from 'react-dom/server'
import App from './App'
import { education, experience, profile } from './content'

function personJsonLd() {
  return JSON.stringify({
    '@context': 'https://schema.org',
    '@type': 'Person',
    name: profile.name,
    jobTitle: profile.role,
    url: profile.site,
    email: `mailto:${profile.email}`,
    sameAs: [profile.github, profile.linkedin],
    address: { '@type': 'PostalAddress', addressLocality: 'New York', addressRegion: 'NY', addressCountry: 'US' },
    worksFor: { '@type': 'Organization', name: experience.company },
    alumniOf: { '@type': 'CollegeOrUniversity', name: education.school },
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
    ['property', 'og:image:alt', `${profile.name}, ${profile.role}, ${profile.location}`],
    ['name', 'twitter:card', 'summary_large_image'],
    ['name', 'twitter:title', profile.title],
    ['name', 'twitter:description', profile.description],
    ['name', 'twitter:image', image],
  ]
  const escape = (s: string) => s.replace(/&/g, '&amp;').replace(/"/g, '&quot;').replace(/</g, '&lt;')
  return [
    `<title>${escape(profile.title)}</title>`,
    `<link rel="canonical" href="${profile.site}" />`,
    ...meta.map(([attr, key, value]) => `<meta ${attr}="${key}" content="${escape(value)}" />`),
    `<script type="application/ld+json">${personJsonLd()}</script>`,
  ].join('\n    ')
}

export function render() {
  return { head: head(), body: renderToStaticMarkup(<App />) }
}
