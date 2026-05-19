#!/usr/bin/env node
/**
 * trim-agent-descriptions.js
 * Bulk-rewrite agent descriptions to ≤200 chars, leading with "Use when".
 *
 * One-off script implementing audit P-003 from docs/planning/audit-2026-05-19.md.
 * Each new description is hand-tuned to preserve triggering signal while removing
 * duplicated specialty-list patterns ("X specialist for A, B, C. Use when tasks involve A, B, C").
 *
 * Idempotent: only rewrites if current description is over 200 chars.
 */

const fs = require('fs');
const path = require('path');

const AGENTS = path.join(__dirname, '..', 'forgebee', 'agents');

// agent-name → new description (each ≤200 chars)
const NEW = {
  'conversion-optimizer.md': 'Use when auditing funnels, optimizing landing pages/forms/checkout, designing A/B tests, or applying behavioral psychology to lift conversion rates. Uses ResearchXL + Invesp frameworks.',
  'email-strategist.md': 'Use when designing email automation flows, segmentation, subject lines, deliverability, or lifecycle sequences (welcome, nurture, cart recovery, re-engagement, win-back).',
  'wordpress-content.md': 'Use when creating WordPress Gutenberg block patterns, ACF-driven content, custom post type entries, WooCommerce product descriptions, or editor formatting.',
  'scrum-master.md': 'Use when breaking features into stories, grooming backlogs, estimating effort, or coordinating sprint execution. Turns requirements into context-rich stories any agent can pick up.',
  'content-creator.md': 'Use when creating ready-to-publish social content — LinkedIn posts, X threads, Instagram carousels, video scripts, email sequences. Adapts content per platform.',
  'calendar-builder.md': 'Use when planning editorial calendars, batching schedules, posting frequency, or cross-platform distribution. Organizes content production workflows.',
  'frontend-specialist.md': 'Use for UI components, styling, state management, and client-side logic. Detects framework from triage and delegates to nextjs-frontend, wordpress-frontend, etc.',
  'content-architect.md': 'Use when designing content strategy structure — pillars, topic clusters, hub-and-spoke models, content pyramids, and platform-content mapping.',
  'performance-analyst.md': 'Use when measuring marketing performance — KPI dashboards, campaign analysis, attribution modeling, A/B test design, and optimization recommendations.',
  'audience-architect.md': 'Use when defining ICP, building personas, mapping buyer journeys, running Jobs-to-be-Done analysis, or segmenting audiences.',
  'wordpress-seo.md': 'Use when configuring WordPress SEO — Yoast/RankMath setup, XML sitemaps, permalink structure, WP-specific schema markup, WooCommerce product SEO.',
  'supabase-specialist.md': 'Use for Supabase work — database schemas, RLS policies, Edge Functions, Auth configuration, Realtime, Storage. Also Postgres + RLS in general.',
  'backend-engineer.md': 'Use for APIs, server logic, middleware, auth, business logic. Detects framework from triage and delegates to wordpress-backend, etc. or handles directly.',
  'database-specialist.md': 'Use for schema design, migrations, query optimization, data modeling. Detects ORM/platform from triage and delegates to supabase-specialist, etc. or handles directly.',
  'test-engineer.md': 'Use for test generation, test fixing, or coverage improvement. Detects framework from triage and delegates to phpunit-engineer, etc. or handles directly.',
  'security-auditor.md': 'Use after code changes touching auth, data handling, APIs, or user input. Detects stack from triage and delegates to wordpress-security, etc. or handles directly.',
  'wordpress-security.md': 'Use for WordPress security audits — sanitization/escaping, nonce verification, capability checks, SQL injection prevention, WPCS compliance.',
  'woocommerce-cro.md': 'Use when optimizing WooCommerce checkout, product pages, cart recovery, or e-commerce funnels. Covers WooCommerce-specific hooks and filters.',
  'deep-researcher.md': 'Use when you need verified answers — investigates documentation, GitHub issues, library APIs, technical questions. No hallucinating, sources cited.',
  'seo-specialist.md': 'Use for keyword research, on-page optimization, technical SEO audits, content strategy, and search ranking improvement.',
  'delivery-agent.md': 'Use when /workflow reaches the delivery phase or work needs final packaging — verifies integration, generates changelog/release notes, updates docs, deployment readiness.',
  'hook-engineer.md': 'Use when creating stop-scrolling hooks, viral formulas, pattern interrupts, engagement triggers, or platform-specific hook libraries.',
  'engagement-strategist.md': 'Use when growing engagement, building communities, or creating engagement playbooks — comment strategies, reciprocity loops, DM flows.',
  'market-intel.md': 'Use when researching competitors, building Fact-Impact-Act battlecards, comparing positioning, or analyzing niches and market trends.',
  'devops-engineer.md': 'Use for deployment pipelines, containerization, VPS setup, or infrastructure operations — Docker, CI/CD, SSL, firewalls, cloud infrastructure.',
  'nextjs-content.md': 'Use when creating MDX content, Contentlayer/Velite patterns, or static generation in Next.js. Invoked by content-writer when Next.js is detected.',
  'idea-machine.md': 'Use when brainstorming content ideas, finding new angles, or building content pipelines — angle mining, repurposing chains, trend surfing, series concepts.',
  'growth-hacker.md': 'Use when designing growth systems, optimizing funnels, or building audience-growth strategies — growth loops, flywheels, viral mechanics.',
  'saas-cro.md': 'Use when optimizing SaaS landing pages, pricing pages, or signup flows. Covers React/Next.js-based conversion patterns.',
  'wordpress-frontend.md': 'Use when developing WordPress block/classic themes, template hierarchy, theme.json, or template parts.',
  'ux-designer.md': 'Use when designing user flows, wireframes, interaction patterns, or running accessibility audits. Produces UX specs — does NOT write code; hand off to frontend-specialist.',
  'brand-strategist.md': 'Use when defining brand strategy, positioning, voice/tone, or messaging frameworks — archetypes, voice guidelines, messaging pillars.',
  'nextjs-frontend.md': 'Use when building Next.js App Router pages, Server/Client Components, SSR patterns, middleware, or Supabase SSR integration.',
  'wordpress-backend.md': 'Use when building WordPress plugin logic, custom REST endpoints, ACF fields, hooks, AJAX, or Settings API in PHP.',
  'nextjs-seo.md': 'Use when implementing Next.js Metadata API, sitemap.ts, robots.ts, OG image generation, next-seo, or React-based structured data.',
  'debugger-detective.md': 'Use proactively when errors occur, tests fail, or bugs need reproducing. Forensic root-cause debugging with 3-failed-fix Iron Law and Failure Capture template.',
  'content-writer.md': 'Use for landing pages, documentation, blog posts, READMEs, changelogs, or launch copy. Writing that converts.',
  'flutter-expert.md': 'Use for Flutter widgets, Dart code, state management (Riverpod, Bloc, Provider), or cross-platform UI across mobile, web, desktop.',
};

function trimAgentDescriptions() {
  let updated = 0;
  let skipped = 0;
  let missing = 0;
  for (const [file, newDesc] of Object.entries(NEW)) {
    const fullpath = path.join(AGENTS, file);
    if (!fs.existsSync(fullpath)) {
      missing++;
      console.log(`  ! missing: ${file}`);
      continue;
    }
    const text = fs.readFileSync(fullpath, 'utf8');
    const match = text.match(/^description: (.+)$/m);
    if (!match) {
      skipped++;
      console.log(`  - no description line: ${file}`);
      continue;
    }
    const currentLen = match[1].length;
    if (currentLen <= 200) {
      skipped++;
      continue;
    }
    if (newDesc.length > 200) {
      console.log(`  ! NEW description still over 200 chars (${newDesc.length}): ${file}`);
      skipped++;
      continue;
    }
    const next = text.replace(/^description: .+$/m, `description: ${newDesc}`);
    fs.writeFileSync(fullpath, next);
    updated++;
    console.log(`  ✓ ${file}: ${currentLen} → ${newDesc.length} chars`);
  }
  console.log(`\nUpdated: ${updated}  Skipped: ${skipped}  Missing: ${missing}`);
}

trimAgentDescriptions();
