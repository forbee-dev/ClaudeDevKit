#!/usr/bin/env node
/**
 * inject-principles.js
 * Bulk-inject Karpathy principles P1 (Trace Test) and P4 (Orphan Rule) into the
 * Principles section of every code-producing agent.
 *
 * Implements part of W9 from docs/planning/5.1.0-comprehensive-plan.md.
 * Idempotent: re-running does nothing if the marker is already present.
 */

const fs = require('fs');
const path = require('path');

const AGENTS_DIR = path.join(__dirname, '..', 'forgebee', 'agents');

// Agents that actually emit code, configs, or content files (vs strategists/analysts)
const CODE_PRODUCING_AGENTS = [
  'backend-engineer.md',
  'frontend-specialist.md',
  'database-specialist.md',
  'devops-engineer.md',
  'debugger-detective.md',
  'flutter-expert.md',
  'ios-expert.md',
  'n8n-builder.md',
  'nextjs-content.md',
  'nextjs-frontend.md',
  'nextjs-seo.md',
  'phpunit-engineer.md',
  'saas-cro.md',
  'supabase-specialist.md',
  'test-engineer.md',
  'woocommerce-cro.md',
  'wordpress-backend.md',
  'wordpress-content.md',
  'wordpress-frontend.md',
  'wordpress-security.md',
  'wordpress-seo.md',
  'content-writer.md',
];

const MARKER = '<!-- karpathy-principles -->';

const P1_P4_BLOCK = `
${MARKER}
## Karpathy Principles (always apply)

**P1 — Trace Test:** Every changed line must trace directly to the user's request. If you can't justify a line by the request, remove it. No drive-by edits.

**P4 — Orphan Rule:** Clean up only your own mess. Remove imports/variables/functions that YOUR changes made unused. Don't remove pre-existing dead code unless asked. Don't 'improve' adjacent code, comments, or formatting. Match existing style, even if you'd do it differently.

**P3 trust-boundary carve-out:** at trust boundaries (network, webhooks, payments, auth, user input, third-party APIs, file uploads), assume hostile/malformed/duplicate input. Error handling at these surfaces is NEVER YAGNI. Skipping it is a P3 violation, not a P3 application.
`;

function injectIntoAgent(file) {
  const fullpath = path.join(AGENTS_DIR, file);
  if (!fs.existsSync(fullpath)) {
    return { file, status: 'missing' };
  }
  const content = fs.readFileSync(fullpath, 'utf8');
  if (content.includes(MARKER)) {
    return { file, status: 'skipped (already has marker)' };
  }

  // Insert immediately AFTER an existing "## Principles" section if present,
  // otherwise insert BEFORE the first of "## Never" / "## Status Reporting" so
  // principles are visible early in the agent's instructions.
  let next;
  const principlesMatch = content.match(/(\n## Principles\n[\s\S]*?)(\n## )/);
  if (principlesMatch) {
    const [whole, principlesBlock, nextHeader] = principlesMatch;
    next = content.replace(whole, principlesBlock + P1_P4_BLOCK + nextHeader);
  } else {
    // Fall back: insert before the first of these section headers
    const fallbackHeaders = ['\n## Never', '\n## Status Reporting'];
    let inserted = false;
    for (const h of fallbackHeaders) {
      const idx = content.indexOf(h);
      if (idx >= 0) {
        next = content.slice(0, idx) + P1_P4_BLOCK + content.slice(idx);
        inserted = true;
        break;
      }
    }
    if (!inserted) {
      // Last resort: append
      next = content.replace(/\n+$/, '\n') + P1_P4_BLOCK;
    }
  }

  fs.writeFileSync(fullpath, next);
  return { file, status: 'injected' };
}

function main() {
  const results = CODE_PRODUCING_AGENTS.map(injectIntoAgent);
  const injected = results.filter(r => r.status === 'injected');
  const skipped = results.filter(r => r.status.startsWith('skipped'));
  const missing = results.filter(r => r.status === 'missing');

  console.log(`Code-producing agents targeted: ${CODE_PRODUCING_AGENTS.length}`);
  console.log(`Injected: ${injected.length}`);
  console.log(`Skipped: ${skipped.length}`);
  console.log(`Missing: ${missing.length}`);
  if (injected.length) {
    console.log('\nInjected:');
    injected.forEach(r => console.log(`  + ${r.file}`));
  }
  if (skipped.length) {
    console.log('\nSkipped:');
    skipped.forEach(r => console.log(`  - ${r.file}`));
  }
  if (missing.length) {
    console.log('\nMissing:');
    missing.forEach(r => console.log(`  ! ${r.file}`));
  }
}

main();
