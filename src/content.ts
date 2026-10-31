export type Prose = { key: string; label: string; words: number; text: string }

export const profile = {
  name: 'Tung Nguyen',
  role: 'Senior Software Engineer',
  company: 'EY',
  city: 'New York',
  timeZone: 'America/New_York',
  email: 'tungnguyen1651@gmail.com',
  github: 'https://github.com/tungcodeforfun',
  linkedin: 'https://linkedin.com/in/tungngvyen',
  resume: '/resume.pdf',
  repo: 'https://github.com/tungcodeforfun/tungcodeforfun.github.io',
  site: 'https://tungthanhnguyen.com/',
  title: 'Tung Nguyen, Senior Software Engineer at EY, New York',
  description: 'Tung Nguyen, Senior Software Engineer at EY in New York. Work log, projects and how to get in touch.',
} as const

export const links = [
  { label: profile.email, href: `mailto:${profile.email}` },
  { label: 'GitHub', href: profile.github },
  { label: 'LinkedIn', href: profile.linkedin },
  { label: 'Résumé', href: profile.resume },
] as const

export const intro: Prose[] = [
  { key: 'intro.hello', label: 'Hello', words: 40, text: 'I’m Tung, a software engineer in New York. I build backend systems that have to keep working when thousands of restaurants lean on them at once, and on the side I run Pullfolio, a small app for card collectors.' },
  { key: 'intro.work', label: 'Work', words: 75, text: 'At EY I’m a senior engineer in Technology Consulting. I own the menu configuration and point-of-sale control services for a national restaurant chain with more than 3,500\u00a0locations, from API design through production, and I’m the release owner for its core Java and Spring Boot service. Recent work: moving chain-wide configuration from synchronous HTTP to SQS batches with safe retries, narrowing venue menus from 1,300\u00a0items to about 130, and cutting P95 latency 65% with Redis caching.' },
  { key: 'intro.life', label: 'Outside work', words: 90, text: 'Outside work I’m training for the NYRR Fred Lebow Half Marathon in January. I collect graded vintage Pokémon cards, which is the hobby Pullfolio is built for. Every fall I play fantasy football and take it more seriously than I should. I also build small tools for myself, like a monitor that watches NYC rental listings so I don’t have to.' },
  { key: 'intro.reach', label: 'How to reach you', words: 45, text: 'Email is the best way to reach me. My code is on GitHub, my work history is on LinkedIn, and the résumé has the details.' },
]

export const log = [
  { date: '10 2026', name: 'This site', href: '/' },
  { date: '01 2026', name: 'streeteasy-monitor', href: 'https://github.com/tungcodeforfun/streeteasy-monitor' },
  { date: '08 2025', name: 'Pullfolio', href: 'https://pullfolio.app' },
  { date: '12 2024', name: 'Senior Software Engineer, EY' },
  { date: '08 2022', name: 'Software Engineer, EY' },
  { date: '06 2022', name: 'B.S. Computer Science, Virginia Tech' },
]

export const projects = [
  { name: 'Pullfolio', href: 'https://pullfolio.app', status: 'Current', line: { key: 'projects.pullfolio', label: 'Pullfolio in one line', words: 15, text: 'Digital binders for trading cards, priced daily. 77,000+\u00a0cards across 4\u00a0games; designed, built and run on my own.' } },
  { name: 'streeteasy-monitor', href: 'https://github.com/tungcodeforfun/streeteasy-monitor', status: '2026', line: { key: 'projects.streeteasy', label: 'streeteasy-monitor in one line', words: 12, text: 'Watches StreetEasy for new NYC rentals and puts them on one dashboard.' } },
  { name: 'This site', href: '/', status: '2026', line: { key: 'projects.site', label: 'This site in one line', words: 12, text: 'Two koi drawn in text characters swim under these words.' } },
]

export const years = {
  summary: { key: 'years.summary', label: 'Summary', words: 25, text: 'Four years of backend work at EY, one product of my own, and a lot of evenings in between.' },
  entries: [
    { year: '2022', story: { key: 'years.2022', label: '2022', words: 60, text: 'Finished a B.S. in Computer Science at Virginia Tech, on the Dean’s List three years running. Joined EY’s Technology Consulting practice in New York as a software engineer, working on the Java and Spring Boot services behind a restaurant chain’s point-of-sale and menu platform.' } },
    { year: '2024', story: { key: 'years.2024', label: '2024', words: 45, text: 'Promoted to senior software engineer in December. As release owner of the core configuration service I’ve shipped 18+\u00a0releases and same-day hotfixes, and moved chain-wide operations from synchronous HTTP to SQS batch processing, which ended the timeouts across 3,500+\u00a0locations.' } },
    { year: '2025', story: { key: 'years.2025', label: '2025', words: 60, text: 'Launched Pullfolio in August: a trading-card collection app with binders you flip through, price alerts and shareable links. A daily pipeline merges 5\u00a0price sources into one catalog of 77,000+\u00a0cards and 144,000+\u00a0priced variants. It had 5,000+\u00a0visitors in its first three weeks.' } },
    { year: '2026', story: { key: 'years.2026', label: '2026', words: 45, text: 'Released streeteasy-monitor, a rental listing monitor for New York. Kept building Pullfolio. Rebuilt this site twice and moved it to tungthanhnguyen.com.' } },
  ],
}

export const titles = { log: 'Log', projects: 'Projects', years: 'Years' } as const
