#!/usr/bin/env node
/**
 * build-index.js
 * Generate forgebee/INDEX.md from skill/agent/command frontmatter.
 *
 * Categorizes by name pattern and file path. Produces a single routing index
 * Claude reads once per session via SessionStart hook — replacing the cost of
 * scanning 115 frontmatter blocks every routing decision.
 *
 * Usage:
 *   node scripts/build-index.js             # write INDEX.md
 *   node scripts/build-index.js --check     # exit 1 if INDEX.md is out of sync
 *
 * Idempotent: running twice with no source changes produces identical output.
 */

const fs = require('fs');
const path = require('path');

const ROOT = path.join(__dirname, '..');
const SKILLS_DIR = path.join(ROOT, 'forgebee', 'skills');
const AGENTS_DIR = path.join(ROOT, 'forgebee', 'agents');
const COMMANDS_DIR = path.join(ROOT, 'forgebee', 'commands');
const OUTPUT = path.join(ROOT, 'forgebee', 'INDEX.md');

const args = process.argv.slice(2);
const checkMode = args.includes('--check');

// ── Frontmatter parsing ──────────────────────────────────────────────────────

function parseFrontmatter(text) {
  const norm = text.replace(/\r\n/g, '\n');
  if (!norm.startsWith('---\n')) return null;
  const end = norm.indexOf('\n---\n', 4);
  if (end < 0) return null;
  const body = norm.slice(4, end);
  const out = {};
  let currentKey = null;
  let multilineValue = '';
  let inMultiline = false;
  for (const line of body.split('\n')) {
    if (inMultiline) {
      if (/^\S/.test(line)) {
        // ended
        out[currentKey] = multilineValue.trim();
        inMultiline = false;
        multilineValue = '';
        // fall through to handle this line
      } else {
        multilineValue += ' ' + line.trim();
        continue;
      }
    }
    const m = line.match(/^([a-zA-Z_-]+):\s*(.*)$/);
    if (!m) continue;
    const [, key, rest] = m;
    if (rest === '>' || rest === '|' || rest.trim() === '') {
      // multiline scalar follows
      currentKey = key;
      multilineValue = '';
      inMultiline = true;
      continue;
    }
    out[key] = rest.trim();
  }
  if (inMultiline) out[currentKey] = multilineValue.trim();
  return out;
}

function loadSurfaces() {
  const skills = [];
  if (fs.existsSync(SKILLS_DIR)) {
    for (const dir of fs.readdirSync(SKILLS_DIR)) {
      const skillFile = path.join(SKILLS_DIR, dir, 'SKILL.md');
      if (!fs.existsSync(skillFile)) continue;
      const text = fs.readFileSync(skillFile, 'utf8');
      const fm = parseFrontmatter(text);
      if (!fm) continue;
      skills.push({
        name: fm.name || dir,
        description: fm.description || '(no description)',
        context: fm.context || 'inline',
        path: path.relative(ROOT, skillFile),
      });
    }
  }

  const agents = [];
  if (fs.existsSync(AGENTS_DIR)) {
    for (const file of fs.readdirSync(AGENTS_DIR)) {
      if (!file.endsWith('.md')) continue;
      if (file === 'references') continue;
      const fullpath = path.join(AGENTS_DIR, file);
      if (!fs.statSync(fullpath).isFile()) continue;
      const text = fs.readFileSync(fullpath, 'utf8');
      const fm = parseFrontmatter(text);
      if (!fm) continue;
      agents.push({
        name: fm.name || file.replace('.md', ''),
        description: fm.description || '(no description)',
        path: path.relative(ROOT, fullpath),
      });
    }
  }

  const commands = [];
  if (fs.existsSync(COMMANDS_DIR)) {
    for (const file of fs.readdirSync(COMMANDS_DIR)) {
      if (!file.endsWith('.md')) continue;
      const fullpath = path.join(COMMANDS_DIR, file);
      const text = fs.readFileSync(fullpath, 'utf8');
      const fm = parseFrontmatter(text);
      if (!fm) continue;
      commands.push({
        name: fm.name || file.replace('.md', ''),
        description: fm.description || '(no description)',
        path: path.relative(ROOT, fullpath),
      });
    }
  }

  return { skills, agents, commands };
}

// ── Categorization ───────────────────────────────────────────────────────────

function categorizeSkill(name) {
  if (/-judge$|-advocate$|-skeptic$/.test(name)) return 'Debate Triads';
  if (/^review-/.test(name) || name === 'review-all') return 'Focused Reviews';
  if (['brainstorming', 'elicitation', 'surface-ambiguity'].includes(name)) return 'Pre-Implementation Discipline';
  if (['terse-report', 'checkpoint-preview', 'investigate'].includes(name)) return 'Execution Discipline';
  if (['continuous-learning', 'audit-self'].includes(name)) return 'System Maintenance';
  if (['forgebee-setup', 'project-router'].includes(name)) return 'Initialization';
  return 'Other';
}

function categorizeAgent(name) {
  if (/^code-(advocate|skeptic|judge)$|^requirements-(advocate|skeptic|judge)$|^strategy-(advocate|skeptic|judge)$/.test(name)) return 'Debate';
  if (/^wordpress-/.test(name)) return 'WordPress Stack';
  if (/^nextjs-/.test(name)) return 'Next.js Stack';
  if (/^supabase-/.test(name)) return 'Database/Backend Stack';
  if (['saas-cro', 'woocommerce-cro', 'conversion-optimizer'].includes(name)) return 'CRO';
  if (['ios-expert', 'flutter-expert'].includes(name)) return 'Mobile Stack';
  if (['phpunit-engineer', 'n8n-builder'].includes(name)) return 'Tool Specialists';
  if (['backend-engineer', 'frontend-specialist', 'database-specialist', 'devops-engineer'].includes(name)) return 'Code Core';
  if (['security-auditor', 'performance-optimizer', 'debugger-detective', 'test-engineer', 'tdd-enforcer', 'verification-enforcer', 'delivery-agent', 'deep-researcher'].includes(name)) return 'Quality & Diagnosis';
  if (['scrum-master', 'architect', 'ux-designer', 'session-librarian', 'contract-validator', 'dashboard-generator'].includes(name)) return 'Process & Architecture';
  if (/-strategist$|-architect$|-analyst$|growth-hacker|hook-engineer|idea-machine|engagement-|calendar-|market-intel|seo-specialist|content-(writer|creator)/.test(name)) return 'Growth & Marketing';
  return 'Other';
}

function categorizeCommand(name) {
  if (['workflow', 'team', 'plan', 'idea', 'architect'].includes(name)) return 'Orchestrators';
  if (['review', 'review-all', 'security', 'test', 'perf', 'audit-self', 'audit'].includes(name)) return 'Quality';
  if (['debug', 'investigate'].includes(name)) return 'Diagnosis';
  if (name === 'elicit') return 'Stress-test';
  if (['growth', 'content', 'landing', 'seo', 'social', 'launch', 'gtm', 'competitive', 'payments', 'analytics'].includes(name)) return 'Growth & Marketing';
  if (['learn', 'evolve', 'instinct-status', 'instinct-export', 'instinct-import'].includes(name)) return 'Continuous Learning';
  if (['docs', 'migrate', 'deploy', 'browser-debug', 'codemaps', 'pm', 'refactor'].includes(name)) return 'Meta & Maintenance';
  return 'Other';
}

function groupBy(items, keyFn) {
  const groups = new Map();
  for (const item of items) {
    const k = keyFn(item.name);
    if (!groups.has(k)) groups.set(k, []);
    groups.get(k).push(item);
  }
  for (const arr of groups.values()) arr.sort((a, b) => a.name.localeCompare(b.name));
  return groups;
}

// ── Rendering ────────────────────────────────────────────────────────────────

const CATEGORY_ORDER_SKILLS = [
  'Pre-Implementation Discipline',
  'Execution Discipline',
  'Focused Reviews',
  'Debate Triads',
  'System Maintenance',
  'Initialization',
  'Other',
];

const CATEGORY_ORDER_AGENTS = [
  'Code Core',
  'Quality & Diagnosis',
  'Process & Architecture',
  'Debate',
  'Database/Backend Stack',
  'WordPress Stack',
  'Next.js Stack',
  'Mobile Stack',
  'CRO',
  'Tool Specialists',
  'Growth & Marketing',
  'Other',
];

const CATEGORY_ORDER_COMMANDS = [
  'Orchestrators',
  'Diagnosis',
  'Quality',
  'Stress-test',
  'Continuous Learning',
  'Growth & Marketing',
  'Meta & Maintenance',
  'Other',
];

function renderGroup(title, groups, order, prefix = '') {
  const out = [`## ${title} (${[...groups.values()].reduce((n, g) => n + g.length, 0)})`, ''];
  for (const cat of order) {
    if (!groups.has(cat)) continue;
    out.push(`### ${cat}`);
    out.push('');
    for (const item of groups.get(cat)) {
      const desc = item.description.length > 140 ? item.description.slice(0, 137) + '...' : item.description;
      out.push(`- \`${prefix}${item.name}\` — ${desc}`);
    }
    out.push('');
  }
  return out.join('\n');
}

function quickTriage() {
  return `## Quick Triage (most common user intents)

| User Intent | Route |
|---|---|
| Build a feature end-to-end | \`/workflow\` (full pipeline with debate) or \`/team\` (faster, no debate) |
| Build a feature with design-first | \`/workflow --strict\` (triggers \`brainstorming\` hard-gate) |
| Pre-push thorough review | \`/review-all\` |
| Focused single-dimension review | \`/review\` (or specific: \`/security\`, \`/perf\`, etc.) |
| Bug with a clear cause | \`/debug\` → \`debugger-detective\` |
| Bug with unclear cause | \`/investigate\` (forensic case file) → handoff to \`debugger-detective\` |
| Stress-test a plan or design | \`/elicit pre-mortem\` (or any of 18 methods) |
| Plan a feature (no code yet) | \`/plan\` (BMAD-style phased) or \`/idea\` (validation + MVP) |
| Architecture decision with trade-offs | \`/architect\` |
| Marketing / content / growth | \`/growth\` (orchestrator) or \`/content\` (single piece) |
| Audit ForgeBee itself for drift | \`/audit-self\` |
| Project tracking and dashboards | \`/pm\` |
| Init ForgeBee on a new project | \`forgebee-setup\` skill |
`;
}

function pairings() {
  return `## Pairings & Handoffs

Surfaces that compose. These are the contracts you can rely on.

- \`/investigate\` → \`debugger-detective\` — diagnosis hands off to fix (forensic case file → Iron Law fix loop)
- \`/workflow\` Execute → \`verification-enforcer\` → \`delivery-agent\` — delivery reads verdict, does NOT re-run tests
- \`/workflow\` Execute → Spec Compliance → \`checkpoint-preview\` → Code Debate → Deliver (full pipeline)
- \`/team\` and \`/workflow\` → \`terse-report\` skill — sub-agent reports compress ~65% via \`responseStyle: orchestrator\` contract field
- \`code-skeptic\` references \`review-all\` checklist as single source of truth (no drift)
- \`tdd-enforcer\` audits TDD cycle discipline; \`test-engineer\` writes the tests. Dispatch test-engineer first, then tdd-enforcer.
- \`/elicit\` auto-offered at end of Plan and Architect phases (opt-out)
- \`/learn\` → \`continuous-learning\` skill → \`compress-learnings.js\` ages out >14-day entries
- All code-producing agents read \`CLAUDE.md\` Karpathy principles P1-P6 (trace test, senior engineer test, YAGNI timing, orphan rule, anti-stop rule, severity standard)
- Every agent runs Adversarial Input Hardening preamble before processing untrusted content
- Every \`Task()\` dispatch from \`/workflow\` or \`/team\` carries a budget envelope (\`maxHops\` default 8, ceiling 64) with constant-string errors
- Email-sequence work → \`email-strategist\` (single owner; \`content-creator\` and \`content-writer\` delegate)
`;
}

function generate({ skills, agents, commands }) {
  const skillGroups = groupBy(skills, categorizeSkill);
  const agentGroups = groupBy(agents, categorizeAgent);
  const commandGroups = groupBy(commands, categorizeCommand);

  const header = `# ForgeBee Routing Index

> **Auto-generated** by \`scripts/build-index.js\`. **Do NOT hand-edit this file.**
> Source of truth: frontmatter in \`forgebee/skills/*\`, \`forgebee/agents/*\`, \`forgebee/commands/*\`.
> Regenerate with: \`node scripts/build-index.js\`

> Loaded on SessionStart so Claude routes user intent to the right surface in one read instead of scanning ${skills.length + agents.length + commands.length} frontmatter blocks.

`;

  const stats = `**Stats:** ${skills.length} skills · ${agents.length} agents · ${commands.length} commands\n\n---\n\n`;

  const sections = [
    header,
    stats,
    quickTriage(),
    '\n---\n',
    renderGroup('Skills', skillGroups, CATEGORY_ORDER_SKILLS),
    '---\n',
    renderGroup('Agents', agentGroups, CATEGORY_ORDER_AGENTS),
    '---\n',
    renderGroup('Commands', commandGroups, CATEGORY_ORDER_COMMANDS, '/'),
    '---\n',
    pairings(),
  ];

  return sections.join('\n');
}

// ── Main ─────────────────────────────────────────────────────────────────────

function main() {
  const surfaces = loadSurfaces();
  const next = generate(surfaces);

  if (checkMode) {
    const current = fs.existsSync(OUTPUT) ? fs.readFileSync(OUTPUT, 'utf8') : '';
    if (current === next) {
      console.log('INDEX.md is in sync with frontmatter.');
      process.exit(0);
    } else {
      console.error('INDEX.md is OUT OF SYNC with frontmatter. Run: node scripts/build-index.js');
      process.exit(1);
    }
  } else {
    fs.writeFileSync(OUTPUT, next);
    console.log(`Wrote ${OUTPUT}`);
    console.log(`  skills: ${surfaces.skills.length}`);
    console.log(`  agents: ${surfaces.agents.length}`);
    console.log(`  commands: ${surfaces.commands.length}`);
    console.log(`  total: ${next.length} chars / ${next.split('\n').length} lines`);
  }
}

main();
