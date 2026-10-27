export const profile = {
  name: 'Tung Nguyen',
  role: 'Senior Software Engineer',
  location: 'New York',
  summary:
    'Four years building backend Java/Spring Boot services, event-driven systems and AWS infrastructure; I also write Python, Go and TypeScript.',
  email: 'tungnguyen1651@gmail.com',
  github: 'https://github.com/tungcodeforfun',
  linkedin: 'https://www.linkedin.com/in/tungngvyen',
  resume: '/resume.pdf',
  site: 'https://tungcodeforfun.github.io/',
  title: 'Tung Nguyen, Senior Software Engineer, New York',
  description:
    'Senior Software Engineer in New York. Four years of backend Java/Spring Boot services, event-driven systems and AWS infrastructure, plus Pullfolio, a product I built and run.',
} as const

export const links = [
  { label: profile.email, href: `mailto:${profile.email}` },
  { label: 'GitHub', href: profile.github },
  { label: 'LinkedIn', href: profile.linkedin },
  { label: 'Résumé (PDF)', href: profile.resume },
] as const

export const hero = {
  scene:
    'A rendering of 3,500 {place|endpoints} taking {change|configuration batches} from a {queue|queue}. One message is retried; a {fail|poisoned message} settles in the dead-letter queue and pages someone.',
  still: 'A still of the rendering: a disc of small lit endpoints around a central queue column, with configuration batches arcing out to them and a red dead-letter basin at the front.',
}

export type SimId = 'queue' | 'menu' | 'cache' | 'match'

export type Control =
  | { kind: 'button'; action: string; label: string }
  | { kind: 'toggle'; action: string; label: string; pressed: boolean }
  | { kind: 'choice'; action: string; label: string; options: readonly string[]; value: number }
  | { kind: 'range'; action: string; label: string; min: number; max: number; value: number; text: string }

export type Simulation = {
  id: SimId
  title: string
  description: string
  hint: string
  caption: string
  readout: string
  controls: Control[]
}

export type CaseStudy = {
  id: string
  title: string
  body: string[]
  cue?: { paragraph: number; action: string }
  sim: Simulation
}

const simCaption = 'A simulation: its counts, timings and names are its own, not production data.'

export const ey = {
  intro:
    'At EY (Technology Consulting) I work for a national quick-service restaurant chain on its POS and menu configuration platform, which spans 3,500+ locations. I own the menu configuration and POS control services from API design through production, and as release owner of the core Java/Spring Boot service I have shipped 18+ releases and same-day hotfixes.',
}

export const caseStudies: CaseStudy[] = [
  {
    id: 'sqs-batches',
    title: 'Chain-wide configuration, moved onto a queue',
    body: [
      'Chain-wide configuration operations ran over synchronous HTTP and timed out.',
      'I re-architected them as SQS batch processing. A {change|configuration change} now waits in a {queue|queue}, and a {worker|worker} applies each message idempotently, so retrying is safe. A message that keeps failing lands in a {fail|dead-letter queue} that raises an alert. The timeouts across 3,500+ {place|locations} stopped.',
    ],
    cue: { paragraph: 1, action: 'poison' },
    sim: {
      id: 'queue',
      title: 'Simulation: configuration batches on a queue',
      description:
        'In this simulation, configuration messages wait in a queue and three workers apply them to a field of locations. A poisoned message fails, returns to the queue after a visibility timeout, fails again, and after its third attempt moves to the dead-letter queue, which raises an alarm and pages the on-call engineer. Other messages keep flowing. In synchronous HTTP mode the simulated caller waits on each location call, and slow calls time out.',
      hint: 'Inject a poisoned message, or switch to synchronous HTTP and send a batch.',
      caption: `${simCaption} Each dot stands in for a group of locations.`,
      readout: 'Messages flow from the queue to the locations.',
      controls: [
        { kind: 'choice', action: 'mode', label: 'Transport', options: ['SQS batches', 'Synchronous HTTP'], value: 0 },
        { kind: 'button', action: 'batch', label: 'Send a batch' },
        { kind: 'button', action: 'poison', label: 'Inject a poisoned message' },
      ],
    },
  },
  {
    id: 'menu-eligibility',
    title: 'Narrowing venue menus',
    body: [
      'Venue menus listed 1,300+ items. I led the event-driven integration with an upstream {source|menu-eligibility platform}: its data comes in over {queue|SNS and SQS} and is served by {worker|venue-aware APIs}.',
      'A cross-account backfill of 1,000+ locations ran idempotently, behind {flag|per-store flags}. Venue {ink|menus} went from 1,300+ items to about 130.',
    ],
    cue: { paragraph: 1, action: 'play' },
    sim: {
      id: 'menu',
      title: 'Simulation: a venue menu narrowing as eligibility events arrive',
      description:
        'A grid of 1,300 menu items. Dragging the eligibility feed forward applies events from the upstream platform, and the items that are not eligible at the chosen venue fall away until about 130 remain, regrouped into a compact menu. Three sample venues keep different items. The backfill raises a flag on each store once; running it again changes nothing.',
      hint: 'Drag the eligibility feed, pick a venue, then run the backfill twice.',
      caption: `${simCaption} The venues are samples.`,
      readout: 'Venue A lists 1,300 items before eligibility events arrive.',
      controls: [
        { kind: 'range', action: 'feed', label: 'Eligibility feed', min: 0, max: 100, value: 0, text: 'events applied' },
        { kind: 'choice', action: 'venue', label: 'Venue', options: ['Venue A', 'Venue B', 'Venue C'], value: 0 },
        { kind: 'button', action: 'backfill', label: 'Run the backfill' },
      ],
    },
  },
  {
    id: 'redis-cache',
    title: 'Caching the POS hot path',
    body: [
      'I designed Redis caching layers for the customer-facing {worker|POS API} endpoints, including a cross-VPC integration with {cache|serverless ElastiCache} that uses {flag|distributed locking}, and rewrote the hot-path {store|database} queries. P95 API latency on those endpoints fell 65%.',
    ],
    sim: {
      id: 'cache',
      title: 'Simulation: POS requests with and without the cache',
      description:
        'In this simulation, requests from POS clients reach the API, which asks a cache in another VPC. Hits return at once; a miss takes a lock, reads the database, fills the cache and returns. A live trace plots each request’s latency and a running P95. Turning the cache off sends every request to the database and the P95 climbs; turning it back on brings it down. The query toggle switches between simulated original and rewritten database queries.',
      hint: 'Turn the cache off and watch the P95 line climb, then turn it back on.',
      caption: `${simCaption} Latencies are illustrative.`,
      readout: 'Cache on, rewritten queries.',
      controls: [
        { kind: 'toggle', action: 'cache', label: 'Redis cache', pressed: true },
        { kind: 'toggle', action: 'queries', label: 'Rewritten queries', pressed: true },
      ],
    },
  },
]

export const pullfolio = {
  name: 'Pullfolio',
  url: 'https://pullfolio.app',
  host: 'pullfolio.app',
  body: [
    'Pullfolio (08/2025 – present) is a trading-card collection app that I designed, built and launched on my own. It had 5,000+ visitors in 3 weeks. It has email, Google and Discord sign-in, shareable binder links, price alerts, and Stripe subscriptions with idempotent, signature-verified webhooks. It is written in TypeScript with React 19, Node.js and PostgreSQL.',
  ],
  shots: {
    desktop: {
      src: '/work/pullfolio-home.webp',
      width: 1280,
      height: 800,
      alt: 'Pullfolio home page: “Every pull gets a pocket.” with a shelf of decorated binders.',
    },
    detail: {
      src: '/work/pullfolio-card.webp',
      width: 1280,
      height: 800,
      alt: 'Pullfolio card page for an Eevee card: market price, 7-day change, and a 30-day price history chart.',
    },
    phone: {
      src: '/work/pullfolio-phone.webp',
      width: 390,
      height: 844,
      alt: 'Pullfolio home page on a phone.',
    },
  },
  pipeline: {
    id: 'pullfolio-pipeline',
    title: 'One catalog from five price sources',
    body: [
      'Every day a pipeline merges 5 {source|price sources} into one {ink|catalog} of 77,000+ cards and 144,000+ priced variants across 4 card games. Each record is matched by {worker|marketplace ID}, then by {worker|set and number}, then by a {worker|confidence-scored name}; an ambiguous match goes to a {fail|review queue} instead of creating a duplicate.',
      'The headline price on each card is built to resist outliers across ~700K price points: source priority, freshness windows, sales preferred over asking prices, and spike checks.',
    ],
    cue: { paragraph: 0, action: 'feed' },
    sim: {
      id: 'match',
      title: 'Simulation: records matched into one catalog',
      description:
        'Sample records arrive from five price sources and pass three stages in order: marketplace ID, set and number, then a confidence-scored name. A record that matches at any stage joins the catalog. A record whose name score falls below the accept threshold goes to the review queue instead of becoming a duplicate.',
      hint: 'Feed records, or feed an ambiguous one and follow it to the review queue.',
      caption: `${simCaption} The card names are made up.`,
      readout: 'Waiting for records.',
      controls: [
        { kind: 'button', action: 'feed', label: 'Feed 12 records' },
        { kind: 'button', action: 'ambiguous', label: 'Feed an ambiguous record' },
      ],
    },
  } satisfies CaseStudy,
  production:
    'It runs in production on Docker Compose with cron jobs, nightly encrypted backups with automated restore checks, Sentry, and GitHub Actions CI/CD, with 170+ test files and 88 end-to-end browser flows.',
}

export const projects = [
  {
    name: 'streeteasy-monitor',
    url: 'https://github.com/tungcodeforfun/streeteasy-monitor',
    text: 'checks StreetEasy for new rentals matching search criteria and messages new matches. Python and Playwright with GraphQL response interception, SQLite, and a Flask and HTMX dashboard.',
  },
]

type Role = { title: string; period: string; bullets: string[] }

export const experience = {
  heading: 'Ernst & Young (EY), Technology Consulting, New York',
  period: '08/2022 – present',
  client: 'For a national quick-service restaurant chain.',
  roles: [
    {
      title: 'Senior Software Engineer',
      period: '12/2024 – present',
      bullets: [
        'Own menu configuration and POS control services for 3,500+ locations, API design through production; release owner of the core Java/Spring Boot service, 18+ releases and same-day hotfixes.',
        'Moved chain-wide configuration operations from synchronous HTTP to SQS batch processing with idempotent retries and DLQ-backed alerting; timeouts across 3,500+ locations stopped.',
        'Narrowed venue menus from 1,300+ items to about 130 by leading event-driven integration with an upstream menu-eligibility platform.',
        'Cut P95 API latency 65% on customer-facing POS endpoints with Redis caching, cross-VPC serverless ElastiCache with distributed locking, and rewritten hot-path queries.',
        'Led production incident response across 6 AWS accounts (lost-update races, payload-size limits, gateway timeouts), root-caused from APM traces and database analysis; my runbooks cut repeat diagnoses from days to minutes.',
        'Cut deployment time 30% across 12+ microservices by re-engineering CI/CD; standardized structured JSON logging and Datadog APM across a Python Lambda fleet and wrote the team’s logging standard.',
      ],
    },
    {
      title: 'Software Engineer',
      period: '08/2022 – 12/2024',
      bullets: [
        'Created a standalone Java gRPC gateway service extracted from the core platform; lead contributor across permissions, discounts, and bulk tax configuration.',
        'Architected an event-driven pipeline (Lambda, SNS, SQS) syncing real-time data between cloud services and on-premise POS systems, thousands of events per minute at peak.',
        'Built Java/Spring Boot REST APIs and a PostgreSQL data layer unifying menu, inventory, and order processing across 3,500+ locations.',
        'Designed gRPC/Protobuf integrations for downstream partner systems, with payloads 40% smaller than JSON.',
        'Raised integration test coverage to 80% with a JUnit and Testcontainers framework that catches breaking changes across service boundaries before deployment.',
        'Mentored 3 junior engineers on microservices patterns and owned the team’s code review standards.',
      ],
    },
  ] satisfies Role[],
}

export const skills = [
  {
    label: 'Languages and frameworks',
    items: 'Java 21, Python, Go, TypeScript, JavaScript, SQL, Spring Boot 3, Node.js, Express, React, JUnit, Testcontainers, Vitest.',
  },
  {
    label: 'Cloud and infrastructure',
    items: 'AWS (Lambda, SQS, SNS, EventBridge, S3, DynamoDB, ElastiCache, CloudFormation/CDK), EKS/Kubernetes ops, Docker, GitHub Actions, Datadog APM, Sentry, LaunchDarkly.',
  },
  { label: 'APIs and integration', items: 'gRPC, Protobuf, connect-rpc, REST APIs, OAuth2/JWT (Okta).' },
  { label: 'Data', items: 'PostgreSQL, Flyway, Drizzle ORM, DynamoDB, Redis.' },
]

export const education = {
  text: 'Virginia Tech, B.S. Computer Science, 06/2022. Dean’s List (2020, 2021, 2022) and the Beyond Boundaries Scholarship. Certified in Microsoft Azure Fundamentals (AZ-900).',
}

export const contract = {
  intro: 'I also take on contract work:',
  offers: [
    {
      title: 'Backend APIs and services',
      body: 'in Java/Spring Boot, Node.js, Python or Go, on PostgreSQL and Redis, with tests, Docker and API docs.',
    },
    {
      title: 'AWS pipelines and delivery',
      body: 'Lambda, SQS and SNS pipelines, CloudFormation/CDK, and CI/CD with GitHub Actions.',
    },
    {
      title: 'Scrapers and monitors',
      body: 'Playwright with API interception, scheduled collection, a small dashboard and alerts.',
    },
  ],
  process:
    'Every project starts with a written scope before any code. You own the repo from day one, every delivery comes with tests and a README, and you get a short async update each working day.',
  bookingUrl: `mailto:${profile.email}?subject=Project%20inquiry`,
  bookingLabel: 'Email me about a project',
}

export const navigation = [
  { label: 'Work', href: '#work' },
  { label: 'Pullfolio', href: '#pullfolio' },
  { label: 'Experience', href: '#experience' },
  { label: 'Contract', href: '#contract' },
  { label: 'Contact', href: '#contact' },
] as const
