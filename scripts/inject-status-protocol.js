#!/usr/bin/env node
/**
 * inject-status-protocol.js
 * One-off bulk apply: append the canonical "Status Reporting" section to every
 * forgebee/agents/*.md file that doesn't already have it.
 *
 * Implements Bucket X1 from docs/planning/5.1.0-comprehensive-plan.md.
 *
 * Idempotent: re-running does nothing if the marker is already present.
 */

const fs = require('fs');
const path = require('path');

const AGENTS_DIR = path.join(__dirname, '..', 'forgebee', 'agents');
const MARKER = '## Status Reporting';

const BLOCK = `
## Status Reporting

When your work concludes, report exactly one of:
- \`DONE\` — work complete, self-review passed, all acceptance criteria met
- \`DONE_WITH_CONCERNS\` — work complete but has trade-offs, risks, or scope deviations to flag
- \`BLOCKED\` — cannot proceed: missing info, failing dependencies, unclear requirements
- \`NEEDS_CONTEXT\` — need information from the session that wasn't in the original handoff

Format: end your output with a single line \`Status: <STATUS>\` (no other tokens). For \`DONE_WITH_CONCERNS\`, list concerns under a \`## Concerns\` section immediately before the status line.
`;

function main() {
  const files = fs.readdirSync(AGENTS_DIR).filter(f => f.endsWith('.md'));
  let added = 0;
  let skipped = 0;
  let added_files = [];
  let skipped_files = [];

  for (const file of files) {
    const fullpath = path.join(AGENTS_DIR, file);
    const content = fs.readFileSync(fullpath, 'utf8');

    if (content.includes(MARKER)) {
      skipped++;
      skipped_files.push(file);
      continue;
    }

    // Ensure file ends with a single newline before we append
    const trimmed = content.replace(/\n+$/, '\n');
    const next = trimmed + BLOCK.trimEnd() + '\n';

    fs.writeFileSync(fullpath, next);
    added++;
    added_files.push(file);
  }

  console.log(`Files scanned: ${files.length}`);
  console.log(`Status Reporting block added to: ${added}`);
  console.log(`Already had marker, skipped: ${skipped}`);
  if (added_files.length > 0) {
    console.log('\nAdded to:');
    added_files.forEach(f => console.log(`  + ${f}`));
  }
  if (skipped_files.length > 0) {
    console.log('\nSkipped:');
    skipped_files.forEach(f => console.log(`  - ${f}`));
  }
}

main();
