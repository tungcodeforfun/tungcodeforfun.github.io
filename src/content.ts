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
  { key: 'intro.hello', label: 'Hello', words: 40, text: '' },
  { key: 'intro.work', label: 'Work', words: 75, text: '' },
  { key: 'intro.life', label: 'Outside work', words: 90, text: '' },
  { key: 'intro.reach', label: 'How to reach you', words: 45, text: '' },
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
  { name: 'Pullfolio', href: 'https://pullfolio.app', status: 'Current', line: { key: 'projects.pullfolio', label: 'Pullfolio in one line', words: 15, text: '' } },
  { name: 'streeteasy-monitor', href: 'https://github.com/tungcodeforfun/streeteasy-monitor', status: '2026', line: { key: 'projects.streeteasy', label: 'streeteasy-monitor in one line', words: 12, text: '' } },
  { name: 'This site', href: '/', status: '2026', line: { key: 'projects.site', label: 'This site in one line', words: 12, text: '' } },
]

export const years = {
  summary: { key: 'years.summary', label: 'Summary', words: 25, text: '' },
  entries: [
    { year: '2022', story: { key: 'years.2022', label: '2022', words: 60, text: '' } },
    { year: '2024', story: { key: 'years.2024', label: '2024', words: 45, text: '' } },
    { year: '2025', story: { key: 'years.2025', label: '2025', words: 60, text: '' } },
    { year: '2026', story: { key: 'years.2026', label: '2026', words: 45, text: '' } },
  ],
}

export const titles = { log: 'Log', projects: 'Projects', years: 'Years' } as const
