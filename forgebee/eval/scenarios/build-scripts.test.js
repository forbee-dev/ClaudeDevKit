#!/usr/bin/env node
/**
 * build-scripts.test.js — Coverage for the maintenance scripts that previously
 * had none (build-index, check-references, bump-version, inject-*).
 *
 * Strategy: run the read-only gates as subprocesses and assert they exit 0, and
 * assert the inject-* idempotency invariant statically (each injected marker
 * appears at most once per agent — the mutators must be safe to re-run). We do
 * NOT execute the inject-* mutators here: they rewrite real agent files, so the
 * invariant is checked over the committed tree instead.
 *
 * Run: node forgebee/eval/scenarios/build-scripts.test.js
 */

const assert = require('assert');
const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

const REPO_ROOT = path.resolve(__dirname, '..', '..', '..');

let passed = 0;
let failed = 0;
const errors = [];

function test(name, fn) {
  try {
    fn();
    passed++;
  } catch (e) {
    failed++;
    errors.push({ name, message: e.message });
  }
}

function exitCode(cmd) {
  try {
    execSync(cmd, { cwd: REPO_ROOT, stdio: ['pipe', 'pipe', 'pipe'], encoding: 'utf8' });
    return 0;
  } catch (e) {
    return e.status || 1;
  }
}

// ── Gate smoke tests (read-only) ─────────────────────────────────────────

test('build-index.js --check exits 0 (INDEX.md in sync with frontmatter)', () => {
  assert.strictEqual(exitCode('node scripts/build-index.js --check'), 0);
});

test('check-references.js exits 0 (no orphan persona references)', () => {
  assert.strictEqual(exitCode('node scripts/check-references.js'), 0);
});

test('bump-version.sh --check exits 0 (all version-bearing files in sync)', () => {
  assert.strictEqual(exitCode('bash scripts/bump-version.sh --check'), 0);
});

// ── inject-* idempotency invariant ───────────────────────────────────────
// Every inject-*.js short-circuits when its MARKER is already present, so a
// re-run must never duplicate a block. Assert that holds across the live tree.

test('injection markers are never duplicated in any agent (idempotency)', () => {
  const agentsDir = path.join(REPO_ROOT, 'forgebee', 'agents');
  const MARKERS = [
    '<!-- karpathy-principles -->',
    '<!-- prompt-defense-baseline -->',
    '## Status Reporting',
    '## Escalation',
  ];
  const files = fs.readdirSync(agentsDir).filter(f => f.endsWith('.md'));
  assert.ok(files.length > 0, 'expected at least one agent file');
  for (const f of files) {
    const content = fs.readFileSync(path.join(agentsDir, f), 'utf8');
    for (const marker of MARKERS) {
      const count = content.split(marker).length - 1;
      assert.ok(count <= 1, `${f}: marker "${marker}" appears ${count}× (expected ≤ 1 — inject-* not idempotent?)`);
    }
  }
});

// ── Results ───────────────────────────────────────────────────────────────

console.log('\n' + '='.repeat(60));
console.log(`Results: ${passed} passed, ${failed} failed, ${passed + failed} total`);
console.log('='.repeat(60));

if (errors.length > 0) {
  console.log('\nFailed tests:');
  for (const { name, message } of errors) {
    console.log(`  FAIL: ${name}`);
    console.log(`        ${message}\n`);
  }
}

process.exit(failed > 0 ? 1 : 0);
