#!/usr/bin/env node
/**
 * check-references.js — Validate persona ↔ references/ symmetry + integrity.
 *
 * Implements H-1 + H-3 from docs/planning/elicit-2026-05-19.md.
 *
 * Checks:
 *   1. Every `forgebee/agents/references/<name>.md` has a matching persona.
 *   2. Every persona with a `## Reference Library` block points to a real file.
 *   3. References that exist are not silently empty (>=20 lines).
 *   4. Reference file's first heading matches its filename.
 *
 * Usage:
 *   node scripts/check-references.js          → exit 1 if any problems
 *   node scripts/check-references.js --fix    → delete orphan references
 */

const fs = require('fs');
const path = require('path');

const ROOT = path.join(__dirname, '..');
const AGENTS_DIR = path.join(ROOT, 'forgebee', 'agents');
const REFS_DIR = path.join(AGENTS_DIR, 'references');

const fixMode = process.argv.slice(2).includes('--fix');

function listAgents() {
  if (!fs.existsSync(AGENTS_DIR)) return [];
  return fs.readdirSync(AGENTS_DIR).filter(f => f.endsWith('.md') && f !== 'references');
}

function listReferences() {
  if (!fs.existsSync(REFS_DIR)) return [];
  return fs.readdirSync(REFS_DIR).filter(f => f.endsWith('.md'));
}

function personaReferencesName(content) {
  const m = content.match(/forgebee\/agents\/references\/([\w-]+)\.md/);
  return m ? `${m[1]}.md` : null;
}

function main() {
  const agents = listAgents();
  const refs = listReferences();
  const refSet = new Set(refs);
  const problems = [];

  // Check 1: orphan references
  for (const refFile of refs) {
    if (!fs.existsSync(path.join(AGENTS_DIR, refFile))) {
      problems.push({ type: 'orphan-reference', file: `forgebee/agents/references/${refFile}`, msg: `No matching persona at forgebee/agents/${refFile}` });
    }
  }

  // Checks 2-4
  for (const agentFile of agents) {
    const content = fs.readFileSync(path.join(AGENTS_DIR, agentFile), 'utf8');
    if (!content.includes('## Reference Library')) continue;
    const referenced = personaReferencesName(content);
    if (!referenced) {
      problems.push({ type: 'persona-points-nowhere', file: `forgebee/agents/${agentFile}`, msg: 'Has Reference Library section but no link' });
      continue;
    }
    if (!refSet.has(referenced)) {
      problems.push({ type: 'missing-reference', file: `forgebee/agents/${agentFile}`, msg: `Points to forgebee/agents/references/${referenced} — file does not exist` });
      continue;
    }
    const refContent = fs.readFileSync(path.join(REFS_DIR, referenced), 'utf8');
    const nonBlank = refContent.split('\n').filter(l => l.trim().length > 0).length;
    if (nonBlank < 20) {
      problems.push({ type: 'empty-reference', file: `forgebee/agents/references/${referenced}`, msg: `Only ${nonBlank} non-blank lines — likely stub` });
    }
    const heading = refContent.match(/^#\s+([^\n]+)/m);
    const expected = referenced.replace(/\.md$/, '').split('-')[0].toLowerCase();
    if (heading && !heading[1].toLowerCase().includes(expected)) {
      problems.push({ type: 'heading-mismatch', file: `forgebee/agents/references/${referenced}`, msg: `Heading "${heading[1]}" doesn't reference "${expected}"` });
    }
  }

  console.log(`Personas:    ${agents.length}`);
  console.log(`References:  ${refs.length}`);
  console.log(`Problems:    ${problems.length}`);
  if (problems.length === 0) {
    console.log('\n✓ All persona ↔ reference pairs check out.');
    process.exit(0);
  }

  for (const p of problems) console.log(`\n[${p.type}] ${p.file}\n  ${p.msg}`);

  if (fixMode) {
    let fixed = 0;
    for (const p of problems) {
      if (p.type === 'orphan-reference') {
        fs.unlinkSync(path.join(ROOT, p.file));
        console.log(`  → deleted ${p.file}`);
        fixed++;
      }
    }
    console.log(`\nAuto-fixed: ${fixed} / ${problems.length}.`);
  } else {
    console.log('\nRun with --fix to delete orphan references.');
  }

  process.exit(problems.length === 0 ? 0 : 1);
}

main();
