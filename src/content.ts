export const profile = {
  name: 'Tung Nguyen',
  role: 'Senior Software Engineer',
  location: 'New York, NY',
  email: 'tungnguyen1651@gmail.com',
  github: 'https://github.com/tungcodeforfun',
  linkedin: 'https://linkedin.com/in/tungngvyen',
} as const

export type Focus = { title: string; body: string }

export const focus: Focus[] = [
  {
    title: 'Distributed systems at chain scale',
    body: 'Event-driven pipelines on SQS and SNS, idempotent batch processing, cross-account integrations, and the failure modes that come with them.',
  },
  {
    title: 'Java, Python, and Go services',
    body: 'Spring Boot core services, Python AWS Lambda fleets, and Go gRPC services, each chosen for the shape of the workload.',
  },
  {
    title: 'Production ownership',
    body: 'Release management, incident forensics, and observability with Datadog APM and structured logging standards.',
  },
  {
    title: 'Safe rollout engineering',
    body: 'Feature-flagged progressive delivery, idempotent backfills, and migrations that can always be re-run instead of restored.',
  },
]

export type Role = {
  title: string
  company: string
  period: string
  start: string
  end?: string
  bullets: string[]
  skills: string[]
}

export const experience: Role[] = [
  {
    title: 'Senior Software Engineer',
    company: 'Ernst & Young',
    period: 'Dec 2024 to present',
    start: '2024-12',
    bullets: [
      'Led migration of legacy systems to AWS, reducing infrastructure costs by 40%',
      'Implemented a Redis caching layer that cut API latency by 65%',
      'Designed and deployed CI/CD pipelines with GitHub Actions and AWS CodePipeline',
      'Mentor junior developers and run code review for a team of five',
    ],
    skills: ['AWS', 'Redis', 'Docker', 'Terraform', 'GitHub Actions'],
  },
  {
    title: 'Software Engineer',
    company: 'Ernst & Young',
    period: 'Aug 2022 to Dec 2024',
    start: '2022-08',
    end: '2024-12',
    bullets: [
      'Built RESTful APIs serving 3,500 restaurant locations at 99.9% uptime',
      'Designed an event-driven architecture on Apache Kafka for real-time data processing',
      'Optimized PostgreSQL queries, reducing response times by 70%',
      'Implemented Datadog monitoring and alerting for production systems',
    ],
    skills: ['Java', 'Spring Boot', 'Kafka', 'PostgreSQL', 'Datadog'],
  },
]

export type Project = {
  name: string
  url: string
  summary: string
  detail: string
  stack: string[]
}

export const projects: Project[] = [
  {
    name: 'tcg-price-tracker',
    url: 'https://github.com/tungcodeforfun/tcg-price-tracker',
    summary: 'Full-stack price tracking platform for trading card games.',
    detail:
      'Multi-marketplace search, portfolio analytics, and price alerts on a FastAPI and React 19 stack, with Celery workers for collection and CI security scanning on every change.',
    stack: ['FastAPI', 'React 19', 'PostgreSQL', 'Redis', 'Celery', 'Docker'],
  },
  {
    name: 'streeteasy-monitor',
    url: 'https://github.com/tungcodeforfun/streeteasy-monitor',
    summary: 'NYC rental listing monitor that finds and contacts new matches automatically.',
    detail:
      'Playwright automation with GraphQL response interception for accurate listing data, a Flask and HTMX dashboard for review, SQLite persistence, and rate-limited outreach.',
    stack: ['Python', 'Playwright', 'Flask', 'HTMX', 'SQLite'],
  },
]

export const freelance = {
  // Replace with a Cal.com or Calendly URL when you have one; the button falls back to email.
  bookingUrl: 'mailto:tungnguyen1651@gmail.com?subject=Project%20inquiry',
  // Set to null to hide the resume link.
  resumeUrl: '/resume.pdf' as string | null,
  offers: [
    {
      title: 'Backend APIs and services',
      body: 'Spring Boot, FastAPI, or Go. PostgreSQL and Redis. Tests, Docker, and API docs with every delivery.',
    },
    {
      title: 'AWS and delivery',
      body: 'Lambda, SQS and SNS pipelines, Terraform, CI/CD with GitHub Actions or CodePipeline.',
    },
    {
      title: 'Scrapers and monitors',
      body: 'Playwright with API interception, scheduled collection, a small dashboard, and alerts.',
    },
  ],
  process: [
    'Written scope before any code',
    'You own the repo from day one',
    'Tests and a README with every delivery',
    'Short async update each working day',
  ],
}

export const education = {
  school: 'Virginia Tech',
  degree: 'B.S. Computer Science, 2022',
  honors: "Dean's List, Beyond Boundaries Scholar",
} as const

export const navigation = [
  { label: 'Work', href: '#work' },
  { label: 'Hire', href: '#hire' },
  { label: 'Experience', href: '#experience' },
  { label: 'Projects', href: '#projects' },
  { label: 'Contact', href: '#contact' },
] as const
