#!/usr/bin/env node
/**
 * inject-escalation.js
 * Add a per-agent Escalation section to agents that lack one.
 *
 * Inserts BEFORE the existing Status Reporting block so escalation is part
 * of the agent's discipline, not an afterthought. Each agent gets a tailored
 * one-line "what triggers escalation" entry matched to its role.
 *
 * Implements Bucket Z item #1 from the audit findings.
 */

const fs = require('fs');
const path = require('path');

const AGENTS = path.join(__dirname, '..', 'forgebee', 'agents');

// Per-agent escalation guidance — tailored to the role, not generic.
const AGENTS_TO_FIX = {
  'architect.md': {
    triggers: [
      'A decision crosses team boundaries you weren\'t briefed on (security, data, payments)',
      'The chosen approach contradicts an existing ADR without justification',
      'No alternative was viable after evaluating 3+ options — surface the constraints',
      'Stack already has a similar pattern but the user is asking for divergence',
    ],
  },
  'deep-researcher.md': {
    triggers: [
      'Authoritative sources contradict each other on a load-bearing fact',
      'A required source is paywalled or behind auth — flag, do not skip',
      'Research scope expanded beyond what was asked — confirm before continuing',
      'Findings contradict an assumption stated in the user\'s request',
    ],
  },
  'flutter-expert.md': {
    triggers: [
      'A native platform integration would require Swift/Kotlin work outside Flutter scope',
      'State management choice conflicts with what\'s already in the project',
      'Pub.dev package required has license or maintenance concerns',
      'Performance ask would require leaving Flutter (e.g., game engine, ML inference)',
    ],
  },
  'ios-expert.md': {
    triggers: [
      'App Store review risk — your change touches privacy manifests, IDFA, or in-app purchase',
      'A required iOS version raises the minimum and would drop user devices',
      'Cross-platform parity broken — the same feature now behaves differently on Android',
      'Performance ask requires private API or out-of-scope native work',
    ],
  },
  'n8n-builder.md': {
    triggers: [
      'A required integration has no n8n node and would need a custom function node — confirm complexity',
      'Workflow involves PII or credentials at scale — flag for security review',
      'Execution mode (queue vs main) affects cost meaningfully — confirm budget',
      'Webhook reliability requires retry/idempotency the user hasn\'t specified',
    ],
  },
  'performance-optimizer.md': {
    triggers: [
      'Optimization would require breaking an API or schema contract',
      'Trade-off makes code meaningfully harder to read — confirm priority',
      'Bottleneck is in a dependency you can\'t modify — escalate to architecture',
      'Profiling impossible (no test data, no staging env) — flag the gap',
    ],
  },
  'scrum-master.md': {
    triggers: [
      'A story can\'t be sized without resolving an open question — block, don\'t guess',
      'Acceptance criteria conflict with the brief — clarify before story creation',
      'Mid-sprint scope change requires re-planning — surface the impact',
      'Stories depend on each other in a way that breaks parallel execution',
    ],
  },
  'session-librarian.md': {
    triggers: [
      'Sensitive information (credentials, PII, tokens) is in scope for archiving — refuse and flag',
      'Memory storage threshold exceeded — propose pruning before adding more',
      'CLAUDE.md update would overwrite user-managed sections — propose a diff',
      'Cross-project contamination detected (e.g., React patterns leaking into a Python project)',
    ],
  },
  'ux-designer.md': {
    triggers: [
      'Accessibility requirement (WCAG, screen reader, keyboard nav) conflicts with the visual ask',
      'A pattern is unfamiliar to the user base — propose A/B test instead of full ship',
      'Interaction would require new component primitives that don\'t exist yet',
      'Cross-platform parity required (web + native) — confirm scope before designing one',
    ],
  },
};

const MARKER = '## Escalation';

function inject(file, triggers) {
  const fullpath = path.join(AGENTS, file);
  const src = fs.readFileSync(fullpath, 'utf8');
  const lines = src.split('\n');
  const stripped = lines.map(l => l.replace(/\r$/, ''));

  if (stripped.some(l => l === MARKER)) {
    return { file, status: 'already-has-escalation' };
  }

  const block = [
    '',
    '## Escalation',
    '',
    'Surface to the user (do not silently decide) when:',
    ...triggers.map(t => `- ${t}`),
    '',
  ];

  // Prefer to insert before "## Status Reporting" so escalation lives next to status semantics
  let anchor = stripped.findIndex(l => l === '## Status Reporting');
  if (anchor < 0) {
    // Fallback to before Communication
    anchor = stripped.findIndex(l => l === '## Communication');
  }
  if (anchor < 0) {
    // Last resort: append before the karpathy-principles marker
    anchor = stripped.findIndex(l => l === '<!-- karpathy-principles -->');
  }
  if (anchor < 0) {
    // Append to end
    anchor = lines.length;
  }

  const next = lines.slice(0, anchor).concat(block).concat(lines.slice(anchor)).join('\n');
  fs.writeFileSync(fullpath, next);
  return { file, status: 'injected', anchor };
}

function main() {
  const results = Object.entries(AGENTS_TO_FIX).map(([f, cfg]) => inject(f, cfg.triggers));
  for (const r of results) console.log(JSON.stringify(r));
}

main();
