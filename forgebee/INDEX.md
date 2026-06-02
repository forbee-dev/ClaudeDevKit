# ForgeBee Routing Index

> **Auto-generated** by `scripts/build-index.js`. **Do NOT hand-edit this file.**
> Source of truth: frontmatter in `forgebee/skills/*`, `forgebee/agents/*`, `forgebee/commands/*`.
> Regenerate with: `node scripts/build-index.js`

> Loaded on SessionStart so Claude routes user intent to the right surface in one read instead of scanning 112 frontmatter blocks.


**Stats:** 32 skills · 44 agents · 36 commands

---


## Quick Triage (most common user intents)

| User Intent | Route |
|---|---|
| Build a feature end-to-end | `/workflow` (full pipeline with debate) or `/team` (faster, no debate) |
| Build a feature with design-first | `/workflow --strict` (triggers `brainstorming` hard-gate) |
| Pre-push thorough review | `/review-all` |
| Focused single-dimension review | `/review` (or specific: `/security`, `/perf`, etc.) |
| Bug with a clear cause | `/debug` → `debugger-detective` |
| Bug with unclear cause | `/investigate` (forensic case file) → handoff to `debugger-detective` |
| Stress-test a plan or design | `/elicit pre-mortem` (or any of 18 methods) |
| Plan a feature (no code yet) | `/plan` (BMAD-style phased) or `/idea` (validation + MVP) |
| Architecture decision with trade-offs | `/architect` |
| Marketing / content / growth | `/growth` (orchestrator) or `/content` (single piece) |
| Audit ForgeBee itself for drift | `/audit-self` |
| Project tracking and dashboards | `/pm` |
| Init ForgeBee on a new project | `forgebee-setup` skill |


---

## Skills (32)

### Pre-Implementation Discipline

- `brainstorming` — Use when invoking /workflow --strict, /plan, or "brainstorm before building" — turns an idea into a written, approved design spec before ...
- `elicitation` — Use after producing a plan or design to stress-test it via a named method (Pre-mortem, Red Team, Inversion, Stakeholder Round Table, etc....
- `surface-ambiguity` — Use when about to make a non-trivial choice with multiple valid interpretations — forces listing of options and the chosen one with ratio...

### Execution Discipline

- `checkpoint-preview` — Use after autonomous /workflow execution to walk the diff by concern (not by file) with risk-tagged hot spots — bridges agent autonomy to...
- `investigate` — Use when handed a crash log, stack trace, or "this used to work" report — produces a forensic case file with evidence grading before code...
- `terse-report` — Use when reporting to an orchestrator (/workflow, /team), not the user — emit telegraphic format keeping code/citations exact, dropping p...

### Focused Reviews

- `review-accessibility` — Use when auditing UI changes for WCAG 2.1 AA compliance — keyboard nav, ARIA, color contrast, focus management, screen reader support, se...
- `review-all` — Use when about to push, open a PR, or asking for a thorough pre-ship review — covers code quality, security, performance, accessibility, ...
- `review-api` — Use when reviewing route handlers, REST/GraphQL endpoints, or API contracts — covers design, input validation, error shapes, auth, rate l...
- `review-best-practices` — Use when reviewing code for SOLID violations, design pattern misuse, leaky abstractions, separation of concerns, or architecture-level sm...
- `review-code` — Use when reviewing staged or recent code changes for logic errors, DRY violations, error handling gaps, type safety issues, or dead code ...
- `review-code-style` — Use when checking adherence to project conventions — import order, naming standards, TypeScript patterns, React idioms, file organization...
- `review-database` — Use when reviewing SQL migrations, queries, RLS/policy changes, schema modifications, or ORM access patterns for safety, performance, or ...
- `review-docs` — Use when reviewing code for missing docblocks, outdated comments, undocumented parameters, unexplained complex logic, or stale README sec...
- `review-performance` — Use when investigating slowness or reviewing code for N+1 queries, memory leaks, expensive loops, missing caching, bundle bloat, or rende...
- `review-security` — Use when auditing code for OWASP Top 10 vulnerabilities, injection flaws, broken auth, secret exposure, or dependency CVEs — typically be...
- `review-tests` — Use when reviewing test suites for coverage gaps, brittle mocks, missing edge cases, or untested code paths — runs after new code or befo...
- `review-wordpress` — Use when reviewing WordPress plugin or theme code for WP coding standards (WPCS), security (nonces, sanitization, escaping), hook naming,...

### Debate Triads

- `code-advocate` — Use when /workflow reaches the code debate phase — argues FOR implementation quality, defends completeness and correctness against the Sk...
- `code-judge` — Use when /workflow code debate needs adjudication — rules on each item after reading blind Advocate and Skeptic cases. Approve, block, or...
- `code-skeptic` — Use when /workflow reaches the code debate phase — argues AGAINST the implementation, finds bugs, security holes, missing requirements, t...
- `requirements-advocate` — Use when /workflow reaches the requirements debate phase — argues FOR planning artifacts, defends quality, feasibility, and completeness ...
- `requirements-judge` — Use when /workflow requirements debate needs adjudication — rules on each item after reading blind Advocate and Skeptic cases. Approve, b...
- `requirements-skeptic` — Use when /workflow reaches the requirements debate phase — argues AGAINST planning artifacts, finds gaps, risks, missing edge cases, flaw...
- `strategy-advocate` — Use when /growth reaches the strategy debate phase — argues FOR marketing strategy artifacts, defends quality, feasibility, and effective...
- `strategy-judge` — Use when /growth strategy debate needs adjudication — rules on each item after reading blind Advocate and Skeptic cases. Approve, block, ...
- `strategy-skeptic` — Use when /growth reaches the strategy debate phase — argues AGAINST marketing strategy, finds weak positioning, audience gaps, flawed ass...

### System Maintenance

- `audit-self` — Use to re-run the ForgeBee self-audit on demand — scores every skill, agent, and command against the scorecard. Writes timestamped findin...
- `continuous-learning` — Use when reviewing learned patterns from recent sessions, processing pending observations, or evolving repeated behaviors into reusable s...

### Initialization

- `forgebee-setup` — Use when initializing ForgeBee on a new project — sets up CLAUDE.md, PM system, and project memory. For command-list questions, invoke th...
- `project-router` — Use at session start or when switching projects — detects stack (WordPress, Next.js, PHP, Node), tooling, styling system, database, and r...

### Other

- `forgebee-help` — Use when the user asks "what commands are available", "how do I use ForgeBee", "what can ForgeBee do", or needs a quick reference. Reads ...

---

## Agents (44)

### Code Core

- `backend-engineer` — Use for APIs, server logic, middleware, auth, business logic. Detects framework from triage and delegates to wordpress-backend, etc. or h...
- `database-specialist` — Use for schema design, migrations, query optimization, data modeling. Detects ORM/platform from triage and delegates to supabase-speciali...
- `devops-engineer` — Use for deployment pipelines, containerization, VPS setup, or infrastructure operations — Docker, CI/CD, SSL, firewalls, cloud infrastruc...
- `frontend-specialist` — Use for UI components, styling, state management, and client-side logic. Detects framework from triage and delegates to nextjs-frontend, ...

### Quality & Diagnosis

- `debugger-detective` — Use proactively when errors occur, tests fail, or bugs need reproducing. Forensic root-cause debugging with 3-failed-fix Iron Law and Fai...
- `deep-researcher` — Use when you need verified answers — investigates documentation, GitHub issues, library APIs, technical questions. No hallucinating, sour...
- `delivery-agent` — Use when /workflow reaches the delivery phase or work needs final packaging — verifies integration, generates changelog/release notes, up...
- `performance-optimizer` — Performance optimization specialist for profiling, bundle analysis, query optimization, and render performance. Use when profiling bottle...
- `security-auditor` — Use after code changes touching auth, data handling, APIs, or user input. Detects stack from triage and delegates to wordpress-security, ...
- `tdd-enforcer` — Use when TDD discipline is required during feature implementation or /workflow execution. Enforces RED-GREEN-REFACTOR and blocks code wri...
- `test-engineer` — Use for test generation, test fixing, or coverage improvement. Detects framework from triage and delegates to phpunit-engineer, etc. or h...
- `verification-enforcer` — Use when verifying task completion or before marking any story as done. Demands concrete evidence — test output, build results, command o...

### Process & Architecture

- `architect` — Architecture advisor for design decisions, trade-offs, and technical strategy. Use when tasks involve system design, technology selection...
- `contract-validator` — Use when orchestrators (/workflow, /growth, /team) hand off work between agents. Validates that agent outputs match the expected contract...
- `dashboard-generator` — Reads docs/pm/state.yaml and regenerates all markdown dashboard views — project index, per-feature detail pages, and decision log. Use wh...
- `scrum-master` — Use when breaking features into stories, grooming backlogs, estimating effort, or coordinating sprint execution. Turns requirements into ...
- `session-librarian` — Session and context management specialist. Maintains the project's institutional knowledge. Use when organizing session history or managi...
- `ux-designer` — Use when designing user flows, wireframes, interaction patterns, or running accessibility audits. Produces UX specs — does NOT write code...

### Database/Backend Stack

- `supabase-specialist` — Use for Supabase work — database schemas, RLS policies, Edge Functions, Auth configuration, Realtime, Storage. Also Postgres + RLS in gen...

### WordPress Stack

- `wordpress-backend` — Use when building WordPress plugin logic, custom REST endpoints, ACF fields, hooks, AJAX, or Settings API in PHP.
- `wordpress-content` — Use when creating WordPress Gutenberg block patterns, ACF-driven content, custom post type entries, WooCommerce product descriptions, or ...
- `wordpress-frontend` — Use when developing WordPress block/classic themes, template hierarchy, theme.json, or template parts.
- `wordpress-security` — Use for WordPress security audits — sanitization/escaping, nonce verification, capability checks, SQL injection prevention, WPCS compliance.
- `wordpress-seo` — Use when configuring WordPress SEO — Yoast/RankMath setup, XML sitemaps, permalink structure, WP-specific schema markup, WooCommerce prod...

### Next.js Stack

- `nextjs-content` — Use when creating MDX content, Contentlayer/Velite patterns, or static generation in Next.js. Invoked by content-creator when Next.js is ...
- `nextjs-frontend` — Use when building Next.js App Router pages, Server/Client Components, SSR patterns, middleware, or Supabase SSR integration.
- `nextjs-seo` — Use when implementing Next.js Metadata API, sitemap.ts, robots.ts, OG image generation, next-seo, or React-based structured data.

### Mobile Stack

- `flutter-expert` — Use for Flutter widgets, Dart code, state management (Riverpod, Bloc, Provider), or cross-platform UI across mobile, web, desktop.
- `ios-expert` — iOS and SwiftUI specialist for native Apple platform development. Use when tasks involve Swift, SwiftUI, UIKit, Xcode project configurati...

### CRO

- `saas-cro` — Use when optimizing SaaS landing pages, pricing pages, or signup flows. Covers React/Next.js-based conversion patterns.
- `woocommerce-cro` — Use when optimizing WooCommerce checkout, product pages, cart recovery, or e-commerce funnels. Covers WooCommerce-specific hooks and filt...

### Tool Specialists

- `n8n-builder` — n8n workflow automation specialist for building integrations, automations, and data pipelines. Use when tasks involve n8n workflows, API ...
- `phpunit-engineer` — WordPress PHPUnit testing subagent for WP_UnitTestCase, test bootstrapping, fixture factories, ACF mocking, and REST API test patterns. U...

### Growth & Marketing

- `audience-architect` — Use when defining ICP, building personas, mapping buyer journeys, running Jobs-to-be-Done analysis, or segmenting audiences.
- `brand-strategist` — Use when defining brand strategy, positioning, voice/tone, or messaging frameworks — archetypes, voice guidelines, messaging pillars.
- `content-creator` — Use to produce ready-to-publish content across the full spectrum — social-native (LinkedIn posts, X threads, IG carousels, Reels/TikTok/Y...
- `content-strategist` — Use to design the content engine end-to-end — pillars/clusters/pyramid/platform-map (architecture), angle mining + repurposing chains + s...
- `email-strategist` — Use when designing email automation flows, segmentation, subject lines, deliverability, or lifecycle sequences (welcome, nurture, cart re...
- `engagement-strategist` — Use when growing engagement, building communities, or creating engagement playbooks — comment strategies, reciprocity loops, DM flows.
- `hook-engineer` — Use when creating stop-scrolling hooks, viral formulas, pattern interrupts, engagement triggers, or platform-specific hook libraries.
- `market-intel` — Use when researching competitors, building Fact-Impact-Act battlecards, comparing positioning, or analyzing niches and market trends.
- `marketing-analyst` — Use to measure marketing performance — North-Star → input → health metric frameworks, KPI dashboards, campaign analysis, attribution mode...
- `seo-specialist` — Use for keyword research, on-page optimization, technical SEO audits, content strategy, and search ranking improvement.

### Other

- `growth-engineer` — Use to engineer compounding growth AND lift conversion — growth loops, flywheels, viral mechanics, funnel diagnosis (acquisition side) pl...

---

## Commands (36)

### Orchestrators

- `/architect` — Architecture advisor — design decisions, trade-offs, and technical strategy
- `/idea` — Idea-to-product agent with adversarial debate — validate an idea, stress-test it through Advocate/Skeptic/Judge debate, define MVP scope,...
- `/plan` — BMAD-inspired planning agent — enforces a phased artifact chain from problem brief through sprint stories before any code gets written
- `/team` — Master orchestrator — analyzes the task, designs an implementation plan, and coordinates specialist agents working in parallel
- `/workflow` — Full-pipeline orchestrator — delegates through Plan → Debate → Architect → Work Breakdown → Execute → Debate → Deliver. Scrum phase is op...

### Diagnosis

- `/debug` — Systematic debugger — reproduce, isolate, diagnose, fix
- `/investigate` — Forensic investigation — produces a structured case file with evidence-graded findings (Confirmed / Deduced / Hypothesized) before any co...

### Quality

- `/audit` — Query the governance audit trail — permission decisions, debate rulings, verification results, agent dispatches, and escalations.
- `/audit-self` — Re-run the ForgeBee self-audit — scores every skill, agent, and command against the scorecard. Detects regressions since the last run. Ou...
- `/perf` — Performance optimizer — profiling, bottleneck detection, and optimization
- `/review` — Expert code reviewer — structural, security, performance, and correctness analysis
- `/security` — Security auditor — vulnerability scanning, threat modeling, and remediation
- `/test` — Test generation expert — unit, integration, e2e, and edge case coverage

### Stress-test

- `/elicit` — Stress-test the most recent plan, design, or architecture artifact using a named reasoning method (Pre-mortem, Red Team, Inversion, Stake...

### Continuous Learning

- `/evolve` — Analyze instincts and cluster them into skills, commands, or agents
- `/instinct-export` — Export instincts to a shareable file
- `/instinct-import` — Import instincts from a file
- `/instinct-status` — Show learned instincts with confidence scores
- `/learn` — Analyze session observations and extract patterns as instincts

### Growth & Marketing

- `/analytics` — Analytics setup and analysis — event tracking, dashboards, funnel analysis, and data-driven insights
- `/competitive` — Competitive intelligence — research competitors, build battlecards, compare positioning, and identify differentiation opportunities
- `/content` — Quick content production — write a single piece or small batch without the full Growth OS pipeline. Uses brand voice and hooks if availab...
- `/growth` — Growth OS orchestrator — delegates through Brand → Intel → Audience → Content Strategy → Hooks → Debate → Creation → Distribution → Measu...
- `/gtm` — Go-to-market planning — launch checklists, positioning, channel strategy, and timeline
- `/landing` — Landing page builder — conversion-optimized pages with hero, features, social proof, pricing, and CTA sections
- `/launch` — Product launch execution — Product Hunt, Hacker News, press outreach, and launch day coordination
- `/payments` — Payment integration specialist — Stripe, LemonSqueezy, Paddle setup, subscription management, webhooks, and billing logic
- `/seo` — SEO audit and optimization — keyword research, on-page fixes, technical SEO, and content strategy
- `/social` — Social media strategy — content calendars, platform playbooks, engagement tactics, and growth campaigns

### Meta & Maintenance

- `/browser-debug` — Browser debugging specialist — Chrome DevTools, network analysis, console errors, DOM inspection, and rendering issues
- `/codemaps` — Generate or refresh token-lean architecture documentation optimized for AI context consumption
- `/deploy` — Deployment coordinator — pre-flight checks, rollout, and post-deploy verification
- `/docs` — Documentation writer — API docs, guides, READMEs, and ADRs
- `/migrate` — Migration specialist — upgrades, version transitions, and data migrations
- `/pm` — Project management dashboard — auto-reads state.yaml and regenerates markdown views. Shows feature status, story progress, decision histo...
- `/refactor` — Code refactoring specialist — improve structure without changing behavior

---

## Pairings & Handoffs

Surfaces that compose. These are the contracts you can rely on.

- `/investigate` → `debugger-detective` — diagnosis hands off to fix (forensic case file → Iron Law fix loop)
- `/workflow` Execute → `verification-enforcer` → `delivery-agent` — delivery reads verdict, does NOT re-run tests
- `/workflow` Execute → Spec Compliance → `checkpoint-preview` → Code Debate → Deliver (full pipeline)
- `/team` and `/workflow` → `terse-report` skill — sub-agent reports compress ~65% via `responseStyle: orchestrator` contract field
- `code-skeptic` references `review-all` checklist as single source of truth (no drift)
- `tdd-enforcer` audits TDD cycle discipline; `test-engineer` writes the tests. Dispatch test-engineer first, then tdd-enforcer.
- `/elicit` auto-offered at end of Plan and Architect phases (opt-out)
- `/learn` → `continuous-learning` skill → `compress-learnings.js` ages out >14-day entries
- All code-producing agents read `CLAUDE.md` Karpathy principles P1-P6 (trace test, senior engineer test, YAGNI timing, orphan rule, anti-stop rule, severity standard)
- Every agent runs Adversarial Input Hardening preamble before processing untrusted content
- Every `Task()` dispatch from `/workflow` or `/team` carries a budget envelope (`maxHops` default 8, ceiling 64) with constant-string errors
- Email-sequence work → `email-strategist` (single owner; `content-creator` and `content-writer` delegate)
