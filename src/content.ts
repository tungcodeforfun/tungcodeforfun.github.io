export const profile = {
  name: 'Tung Nguyen',
  role: 'Senior Software Engineer',
  location: 'New York',
  email: 'tungnguyen1651@gmail.com',
  github: 'https://github.com/tungcodeforfun',
  linkedin: 'https://linkedin.com/in/tungngvyen',
  resume: '/resume.pdf',
  site: 'https://tungthanhnguyen.com/',
  title: 'Tung Nguyen, Senior Software Engineer, New York',
  description: 'Tung Nguyen, Senior Software Engineer in New York.',
} as const

export const links = [
  { label: profile.email, href: `mailto:${profile.email}` },
  { label: 'GitHub', href: profile.github },
  { label: 'LinkedIn', href: profile.linkedin },
  { label: 'Résumé', href: profile.resume },
] as const
