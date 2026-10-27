import type { DiagramSpec, Tone } from './diagram/spec'

export const profile = {
  name: 'Tung Nguyen',
  role: 'Senior Software Engineer',
  location: 'New York, NY',
  experience: '4 years',
  stack: ['Java / Spring Boot', 'AWS event-driven systems', 'Python', 'Go', 'TypeScript'],
  now: 'EY Technology Consulting. POS and menu configuration platform for a national restaurant chain, 3,500+ locations.',
  email: 'tungnguyen1651@gmail.com',
  github: 'https://github.com/tungcodeforfun',
  linkedin: 'https://www.linkedin.com/in/tungngvyen',
  resume: '/resume.pdf',
  source: 'https://github.com/tungcodeforfun/tungcodeforfun.github.io',
  site: 'https://tungcodeforfun.github.io/',
  title: 'Tung Nguyen, Senior Software Engineer, New York',
  description:
    'Senior Software Engineer in New York. 4 years of Java/Spring Boot services and AWS event-driven systems. Case studies, Pullfolio, and contract work.',
} as const

export const links = [
  { label: 'Email', short: profile.email, href: `mailto:${profile.email}`, text: profile.email },
  { label: 'GitHub', short: 'GitHub', href: profile.github, text: 'github.com/tungcodeforfun' },
  { label: 'LinkedIn', short: 'LinkedIn', href: profile.linkedin, text: 'linkedin.com/in/tungngvyen' },
  { label: 'Resume', short: 'Resume (PDF)', href: profile.resume, text: 'PDF, one page' },
] as const

export const field = {
  label: 'Fig. 0',
  caption: 'A chain-wide configuration change applied in batches. One dot per location.',
  description: '3,500 dots in a grid, one per location. Rows light up in turn as batches are applied.',
  legend: { applied: 'applied', retried: 'retried' },
} as const

export type Result = { value: string; label: string }

export type CaseStudy = {
  id: string
  figure: string
  title: string
  problem: string
  decisions: string[]
  results: Result[]
  stack: string[]
  legend: Partial<Record<Tone, string>>
  diagram: DiagramSpec
}

export const caseStudies: CaseStudy[] = [
  {
    id: 'sqs-batches',
    figure: 'Fig. 1',
    title: 'Chain-wide configuration, off synchronous HTTP',
    problem: 'Configuration operations across 3,500+ locations ran over synchronous HTTP and timed out.',
    decisions: [
      'Re-architected the operations from synchronous HTTP to SQS batch processing.',
      'Retries are idempotent, so a redelivered message is safe to apply again.',
      'Messages that keep failing land in a dead-letter queue, which alerts.',
    ],
    results: [{ value: '3,500+', label: 'locations, timeouts eliminated' }],
    stack: ['AWS SQS', 'Dead-letter queue', 'Idempotent consumers'],
    legend: { ok: 'message', alt: 'retried', fail: 'poison message' },
    diagram: {
      title: 'Configuration operations over SQS with retries and a dead-letter queue',
      description:
        'A configuration change is enqueued to SQS. A worker applies it idempotently to 3,500+ locations. A failed message is retried through the queue. A message that keeps failing moves to the dead-letter queue, which raises an alert.',
      nodes: [
        { id: 'change', label: 'Config change', detail: 'chain-wide', wide: [0, 0], narrow: [0, 0] },
        { id: 'queue', label: 'SQS', detail: 'batch queue', wide: [1, 0], narrow: [0, 1] },
        { id: 'worker', label: 'Worker', detail: 'idempotent apply', wide: [2, 0], narrow: [0, 2] },
        { id: 'stores', label: '3,500+ locations', detail: 'POS configuration', wide: [3, 0], narrow: [0, 3] },
        { id: 'dlq', label: 'DLQ', detail: 'dead-letter queue', alert: true, wide: [1, 1], narrow: [1, 1] },
        { id: 'alert', label: 'Alert', alert: true, wide: [2, 1], narrow: [1, 2] },
      ],
      edges: [
        { from: 'change', to: 'queue' },
        { from: 'queue', to: 'worker' },
        { from: 'worker', to: 'stores' },
        { from: 'worker', to: 'queue', kind: 'retry', loop: true, label: 'retry' },
        { from: 'queue', to: 'dlq', kind: 'fail' },
        { from: 'dlq', to: 'alert', kind: 'fail' },
      ],
      flows: [
        { route: ['change', 'queue', 'worker', 'stores'], tone: 'ok' },
        { route: ['change', 'queue', 'worker', 'stores'], tone: 'ok' },
        { route: ['change', 'queue', 'worker', 'queue', 'worker', 'stores'], tone: 'alt' },
        { route: ['change', 'queue', 'worker', 'queue', 'dlq', 'alert'], tone: 'fail' },
      ],
    },
  },
  {
    id: 'menu-eligibility',
    figure: 'Fig. 2',
    title: 'Venue menus from an upstream eligibility platform',
    problem: 'Venue menus listed 1,300+ items.',
    decisions: [
      'Led the event-driven integration with an upstream menu-eligibility platform: SNS/SQS ingestion and venue-aware APIs.',
      'Backfilled 1,000+ locations across accounts, idempotently, behind per-store flags.',
    ],
    results: [{ value: '~130', label: 'items per venue menu, down from 1,300+' }],
    stack: ['AWS SNS', 'AWS SQS', 'Per-store feature flags'],
    legend: { ok: 'eligibility event', alt: 'backfill' },
    diagram: {
      title: 'Menu-eligibility events ingested over SNS and SQS, with a flagged backfill',
      description:
        'The upstream menu-eligibility platform publishes to SNS. An SQS queue feeds the menu configuration service, which serves venue menus through venue-aware APIs. An idempotent cross-account backfill of 1,000+ locations enters through per-store flags.',
      nodes: [
        { id: 'upstream', label: 'Menu-eligibility platform', detail: 'upstream', wide: [0, 0], narrow: [0, 0] },
        { id: 'sns', label: 'SNS', wide: [1, 0], narrow: [0, 1] },
        { id: 'sqs', label: 'SQS', detail: 'ingestion', wide: [2, 0], narrow: [0, 2] },
        { id: 'menu', label: 'Menu configuration', wide: [3, 0], narrow: [0, 3] },
        { id: 'api', label: 'Venue-aware API', wide: [4, 0], narrow: [0, 4] },
        { id: 'backfill', label: 'Backfill', detail: 'idempotent, cross-account, 1,000+ locations', wide: [1, 1], narrow: [1, 1] },
        { id: 'flags', label: 'Per-store flags', wide: [3, 1], narrow: [1, 3] },
        { id: 'venue', label: 'Venue menu', detail: '~130 items', wide: [4, 1], narrow: [1, 4] },
      ],
      edges: [
        { from: 'upstream', to: 'sns' },
        { from: 'sns', to: 'sqs' },
        { from: 'sqs', to: 'menu' },
        { from: 'menu', to: 'api' },
        { from: 'api', to: 'venue' },
        { from: 'upstream', to: 'backfill', bend: { wide: 'vh', narrow: 'hv' } },
        { from: 'backfill', to: 'flags' },
        { from: 'flags', to: 'menu' },
      ],
      flows: [
        { route: ['upstream', 'sns', 'sqs', 'menu', 'api', 'venue'], tone: 'ok' },
        { route: ['upstream', 'backfill', 'flags', 'menu', 'api', 'venue'], tone: 'alt' },
        { route: ['upstream', 'sns', 'sqs', 'menu', 'api', 'venue'], tone: 'ok' },
      ],
    },
  },
  {
    id: 'redis-cache',
    figure: 'Fig. 3',
    title: 'Caching the POS hot path',
    problem: 'Customer-facing POS endpoints needed lower P95 latency.',
    decisions: [
      'Designed Redis caching layers for the customer-facing POS endpoints.',
      'Integrated serverless ElastiCache across VPCs, with distributed locking.',
      'Rewrote the hot-path database queries.',
    ],
    results: [{ value: '−65%', label: 'P95 API latency' }],
    stack: ['Redis', 'ElastiCache Serverless', 'Distributed locking'],
    legend: { ok: 'cache hit', alt: 'cache miss' },
    diagram: {
      title: 'POS API reading through a cross-VPC serverless ElastiCache',
      description:
        'POS clients call the POS API. The API reads from serverless ElastiCache in another VPC. A cache hit returns without touching the database; a cache miss reads the database and fills the cache.',
      nodes: [
        { id: 'pos', label: 'POS clients', wide: [0, 0], narrow: [0, 0] },
        { id: 'api', label: 'POS API', detail: 'customer-facing', wide: [1, 0], narrow: [0, 1] },
        { id: 'cache', label: 'ElastiCache', detail: 'Redis, serverless', wide: [2, 0], narrow: [1, 1] },
        { id: 'db', label: 'Database', detail: 'hot-path queries rewritten', wide: [1, 1], narrow: [0, 2] },
      ],
      edges: [
        { from: 'pos', to: 'api' },
        { from: 'api', to: 'cache' },
        { from: 'api', to: 'db' },
      ],
      groups: [
        { label: 'service VPC', nodes: ['api'] },
        { label: 'cache VPC', nodes: ['cache'] },
      ],
      flows: [
        { route: ['pos', 'api', 'cache', 'api', 'pos'], tone: 'ok' },
        { route: ['pos', 'api', 'cache', 'api', 'db', 'api', 'cache', 'api', 'pos'], tone: 'alt' },
        { route: ['pos', 'api', 'cache', 'api', 'pos'], tone: 'ok' },
        { route: ['pos', 'api', 'cache', 'api', 'pos'], tone: 'ok' },
      ],
    },
  },
]

export const pullfolio = {
  name: 'Pullfolio',
  url: 'https://pullfolio.app',
  host: 'pullfolio.app',
  period: '08/2025 – present',
  summary:
    'A trading-card collection app. Designed, built and launched solo: 5,000+ visitors in 3 weeks.',
  features: [
    'Email, Google and Discord sign-in',
    'Shareable binder links',
    'Price alerts',
    'Stripe subscriptions with idempotent, signature-verified webhooks',
  ],
  stack: ['TypeScript', 'React 19', 'Node.js', 'PostgreSQL', 'Stripe', 'Docker'],
  shots: [
    {
      src: '/work/pullfolio-home.webp',
      width: 1280,
      height: 800,
      alt: 'Pullfolio home page: "Every pull gets a pocket." with a shelf of decorated binders.',
      caption: 'pullfolio.app, home',
    },
    {
      src: '/work/pullfolio-card.webp',
      width: 1280,
      height: 800,
      alt: 'Pullfolio card page for an Eevee card: market price, 7-day change, and a 30-day price history chart.',
      caption: 'Card page with headline price and history',
    },
    {
      src: '/work/pullfolio-phone.webp',
      width: 390,
      height: 844,
      alt: 'Pullfolio home page on a phone.',
      caption: 'Phone',
    },
  ],
  pipeline: {
    id: 'pullfolio-pipeline',
    figure: 'Fig. 4',
    title: 'One catalog from five price sources',
    problem: 'Merge 5 price sources into one catalog, daily, without creating duplicate cards.',
    decisions: [
      'Match each record by marketplace ID, then set and number, then confidence-scored name.',
      'Ambiguous matches go to a review queue instead of creating duplicates.',
      'Headline prices are outlier-resistant: source priority, freshness windows, sales over asking prices, spike checks.',
    ],
    results: [
      { value: '77,000+', label: 'cards' },
      { value: '144,000+', label: 'priced variants' },
      { value: '4', label: 'card games' },
      { value: '~700K', label: 'price points' },
    ],
    stack: ['TypeScript', 'Node.js', 'PostgreSQL'],
    legend: { ok: 'matched record', fail: 'ambiguous match' },
    diagram: {
      title: 'Pullfolio daily pricing pipeline with a three-step matcher and a review queue',
      description:
        'Records from 5 price sources are matched by marketplace ID, then set and number, then confidence-scored name. Matches join the catalog of 77,000+ cards and 144,000+ priced variants across 4 card games; ambiguous matches go to a review queue. The catalog feeds outlier-resistant headline pricing over ~700K price points.',
      nodes: [
        { id: 'sources', label: '5 price sources', detail: 'daily', wide: [0, 0], narrow: [0, 0] },
        { id: 'id', label: 'Marketplace ID', detail: 'match 1', wide: [1, 0], narrow: [0, 1] },
        { id: 'setnum', label: 'Set + number', detail: 'match 2', wide: [2, 0], narrow: [0, 2] },
        { id: 'name', label: 'Name', detail: 'match 3, confidence-scored', wide: [3, 0], narrow: [0, 3] },
        { id: 'review', label: 'Review queue', detail: 'ambiguous matches', alert: true, wide: [4, 0], narrow: [0, 4] },
        { id: 'catalog', label: 'Catalog', detail: '77,000+ cards, 144,000+ variants', wide: [2, 1], narrow: [1, 1] },
        { id: 'price', label: 'Headline price', detail: 'outlier-resistant', wide: [2, 2], narrow: [1, 0] },
      ],
      edges: [
        { from: 'sources', to: 'id' },
        { from: 'id', to: 'setnum', label: 'no match' },
        { from: 'setnum', to: 'name', label: 'no match' },
        { from: 'name', to: 'review', kind: 'fail' },
        { from: 'id', to: 'catalog', bend: 'vh' },
        { from: 'setnum', to: 'catalog', bend: 'hv' },
        { from: 'name', to: 'catalog', bend: { wide: 'vh', narrow: 'hv' } },
        { from: 'catalog', to: 'price' },
      ],
      flows: [
        { route: ['sources', 'id', 'catalog', 'price'], tone: 'ok' },
        { route: ['sources', 'id', 'setnum', 'catalog', 'price'], tone: 'ok' },
        { route: ['sources', 'id', 'setnum', 'name', 'catalog', 'price'], tone: 'ok' },
        { route: ['sources', 'id', 'setnum', 'name', 'review'], tone: 'fail' },
      ],
    },
  } satisfies CaseStudy,
  production: [
    'Docker Compose with cron jobs',
    'Nightly encrypted backups with automated restore checks',
    'Sentry',
    'GitHub Actions CI/CD',
    '170+ test files and 88 end-to-end browser flows',
  ],
}

export const projects = [
  {
    name: 'streeteasy-monitor',
    url: 'https://github.com/tungcodeforfun/streeteasy-monitor',
    summary: 'Checks StreetEasy for new rentals matching search criteria and messages new matches.',
    detail: 'Playwright with GraphQL response interception, SQLite, and a Flask + HTMX dashboard.',
    stack: ['Python', 'Playwright', 'Flask', 'HTMX', 'SQLite'],
  },
]

export type Bullet = { text: string; figure?: { label: string; href: string } }

export type Role = { title: string; period: string; bullets: Bullet[] }

export const experience = {
  company: 'Ernst & Young (EY)',
  unit: 'Technology Consulting',
  location: 'New York, NY',
  client: 'Client: national quick-service restaurant chain',
  period: '08/2022 – present',
  roles: [
    {
      title: 'Senior Software Engineer',
      period: '12/2024 – present',
      bullets: [
        {
          text: 'Own menu configuration and POS control services for 3,500+ locations, from API design through production. Release owner of the core Java/Spring Boot service: 18+ releases and same-day hotfixes.',
        },
        {
          text: 'Re-architected chain-wide configuration operations from synchronous HTTP to SQS batch processing with idempotent retries and DLQ-backed alerting. Timeouts eliminated across 3,500+ locations.',
          figure: { label: 'Fig. 1', href: '#sqs-batches' },
        },
        {
          text: 'Narrowed venue menus from 1,300+ items to ~130 by leading event-driven integration with an upstream menu-eligibility platform.',
          figure: { label: 'Fig. 2', href: '#menu-eligibility' },
        },
        {
          text: 'Cut P95 API latency 65% on customer-facing POS endpoints: Redis caching layers, cross-VPC serverless ElastiCache with distributed locking, rewritten hot-path queries.',
          figure: { label: 'Fig. 3', href: '#redis-cache' },
        },
        {
          text: 'Led production incident response across 6 AWS accounts: lost-update races, payload-size limits and gateway timeouts, root-caused from APM traces and database analysis. Runbooks cut repeat diagnoses from days to minutes.',
        },
        {
          text: 'Cut deployment time 30% across 12+ microservices by re-engineering CI/CD pipelines. Standardized structured JSON logging and Datadog APM across a Python Lambda fleet; wrote the team’s logging standard.',
        },
      ],
    },
    {
      title: 'Software Engineer',
      period: '08/2022 – 12/2024',
      bullets: [
        {
          text: 'Created a standalone Java gRPC gateway service, extracted from the core platform; lead contributor across permissions, discounts, and bulk tax configuration.',
        },
        {
          text: 'Architected an event-driven pipeline (Lambda, SNS, SQS) syncing real-time data between cloud services and on-premise POS systems, thousands of events per minute at peak.',
        },
        {
          text: 'Built Java/Spring Boot REST APIs and a PostgreSQL data layer unifying menu, inventory, and order processing across 3,500+ locations.',
        },
        {
          text: 'Designed gRPC/Protobuf integrations for downstream partner systems: payloads 40% smaller than JSON.',
        },
        {
          text: 'Raised integration test coverage to 80% with a JUnit + Testcontainers framework that catches breaking changes across service boundaries before deployment.',
        },
        { text: 'Mentored 3 junior engineers on microservices patterns; owned the team’s code review standards.' },
      ],
    },
  ] satisfies Role[],
}

export const skills = [
  {
    label: 'Languages & frameworks',
    items: 'Java 21, Python, Go, TypeScript, JavaScript, SQL, Spring Boot 3, Node.js, Express, React, JUnit, Testcontainers, Vitest',
  },
  {
    label: 'Cloud & infrastructure',
    items: 'AWS (Lambda, SQS, SNS, EventBridge, S3, DynamoDB, ElastiCache, CloudFormation/CDK), EKS/Kubernetes ops, Docker, GitHub Actions, Datadog APM, Sentry, LaunchDarkly',
  },
  { label: 'APIs & integration', items: 'gRPC, Protobuf, connect-rpc, REST APIs, OAuth2/JWT (Okta)' },
  { label: 'Data', items: 'PostgreSQL, Flyway, Drizzle ORM, DynamoDB, Redis' },
]

export const contract = {
  bookingUrl: 'mailto:tungnguyen1651@gmail.com?subject=Project%20inquiry',
  offers: [
    {
      title: 'Backend APIs and services',
      body: 'Java/Spring Boot, Node.js, Python, or Go. PostgreSQL and Redis. Tests, Docker, and API docs with every delivery.',
    },
    {
      title: 'AWS and delivery',
      body: 'Lambda, SQS and SNS pipelines, CloudFormation/CDK, CI/CD with GitHub Actions.',
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
  location: 'Blacksburg, VA',
  degree: 'B.S. Computer Science',
  date: '06/2022',
  honors: ['Dean’s List (2020, 2021, 2022)', 'Beyond Boundaries Scholarship'],
  certification: 'Microsoft Azure Fundamentals (AZ-900)',
}

export const navigation = [
  { label: 'Systems', href: '#systems' },
  { label: 'Pullfolio', href: '#pullfolio' },
  { label: 'Experience', href: '#experience' },
  { label: 'Contract', href: '#contract' },
  { label: 'Contact', href: '#contact' },
] as const
