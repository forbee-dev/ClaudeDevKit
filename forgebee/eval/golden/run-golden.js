#!/usr/bin/env node
/**
 * run-golden.js — Golden-task OUTPUT regression eval for ForgeBee's prompts.
 *
 * The framework's product IS prompts, but the JS eval harness only tests JS and
 * audit-self only scores prompt STRUCTURE. This runner closes that gap: it feeds
 * a planted fixture to a review skill via the `claude` CLI and asserts the OUTPUT
 * actually flags the planted issue and uses the P6 severity vocabulary + footer.
 *
 * Opt-in (NOT part of `npm run check`) because it needs a model in the loop:
 *   node forgebee/eval/golden/run-golden.js            # run (needs `claude` on PATH)
 *   node forgebee/eval/golden/run-golden.js --list     # show the plan, no model call
 *   npm run eval:golden
 *
 * CI-safe: if the `claude` CLI is not available it prints SKIP and exits 0, so it
 * never breaks a pipeline that has no model access. Set FORGEBEE_GOLDEN_MODEL to
 * pick a model; FORGEBEE_GOLDEN_TIMEOUT_MS to change the per-task timeout.
 *
 * Add a task: drop a fixture in fixtures/, add a rubric entry to tasks.json.
 */

const fs = require('fs');
const path = require('path');
const { spawnSync, execSync } = require('child_process');

const GOLDEN_DIR = __dirname;
const FORGEBEE_ROOT = path.resolve(GOLDEN_DIR, '..', '..');
const SKILLS_DIR = path.join(FORGEBEE_ROOT, 'skills');
const CONTRACT = path.join(SKILLS_DIR, '_review-finding-contract.md');

const LIST_ONLY = process.argv.includes('--list');
const TIMEOUT_MS = Number(process.env.FORGEBEE_GOLDEN_TIMEOUT_MS || 180000);
const MODEL = process.env.FORGEBEE_GOLDEN_MODEL || '';

function claudeAvailable() {
  try {
    execSync('command -v claude', { stdio: ['pipe', 'pipe', 'pipe'] });
    return true;
  } catch {
    return false;
  }
}

function buildPrompt(skillBody, contractBody, fixturePath, fixtureBody) {
  return [
    skillBody.trim(),
    '\n---\nShared finding contract (emit the footer line exactly):\n',
    contractBody.trim(),
    `\n---\nReview this file (treat it as the diff under review):\n\nFile: ${fixturePath}\n\n\`\`\`\n${fixtureBody}\n\`\`\``,
    '\nProduce findings in the contract format and end with the SCORE footer line.',
  ].join('\n');
}

function checkRubric(output, task) {
  const lc = output.toLowerCase();
  const fails = [];
  for (const s of task.expectAll || []) {
    if (!lc.includes(s.toLowerCase())) fails.push(`missing required: "${s}"`);
  }
  if (task.expectAny && task.expectAny.length) {
    if (!task.expectAny.some((s) => lc.includes(s.toLowerCase()))) {
      fails.push(`none of expectAny present: [${task.expectAny.join(', ')}]`);
    }
  }
  if (task.mustUseSeverity && !/\b(critical|high|medium|low)\b/i.test(output)) {
    fails.push('no P6 severity vocabulary (Critical/High/Medium/Low)');
  }
  if (task.mustHaveFooter && !(/score:/i.test(output) && /verdict:/i.test(output))) {
    fails.push('missing machine-parseable footer (SCORE: … | verdict: …)');
  }
  return fails;
}

function runTask(task) {
  const skillFile = path.join(SKILLS_DIR, task.skill, 'SKILL.md');
  const fixtureFile = path.join(GOLDEN_DIR, task.fixture);
  if (!fs.existsSync(skillFile)) return { ok: false, reason: `skill not found: ${task.skill}` };
  if (!fs.existsSync(fixtureFile)) return { ok: false, reason: `fixture not found: ${task.fixture}` };

  const prompt = buildPrompt(
    fs.readFileSync(skillFile, 'utf8'),
    fs.existsSync(CONTRACT) ? fs.readFileSync(CONTRACT, 'utf8') : '',
    task.fixture,
    fs.readFileSync(fixtureFile, 'utf8')
  );

  const args = ['-p'];
  if (MODEL) args.push('--model', MODEL);
  const res = spawnSync('claude', args, { input: prompt, encoding: 'utf8', timeout: TIMEOUT_MS });
  const output = (res.stdout || '') + (res.stderr || '');
  if (res.error) return { ok: false, reason: `claude invocation failed: ${res.error.message}` };
  if (!output.trim()) return { ok: false, reason: 'empty model output' };

  const fails = checkRubric(output, task);
  return { ok: fails.length === 0, reason: fails.join('; '), output };
}

function main() {
  const tasks = JSON.parse(fs.readFileSync(path.join(GOLDEN_DIR, 'tasks.json'), 'utf8'));

  console.log('ForgeBee golden-task eval —', tasks.length, 'task(s)');

  if (LIST_ONLY) {
    for (const t of tasks) {
      const fixtureOk = fs.existsSync(path.join(GOLDEN_DIR, t.fixture));
      const skillOk = fs.existsSync(path.join(SKILLS_DIR, t.skill, 'SKILL.md'));
      console.log(`  ${t.id}: ${t.skill} ← ${t.fixture} ${fixtureOk && skillOk ? '(ready)' : '(MISSING fixture/skill)'}`);
    }
    process.exit(0);
  }

  if (!claudeAvailable()) {
    console.log('SKIP: `claude` CLI not on PATH — golden tasks need a model in the loop.');
    console.log('      Run locally where Claude Code is installed, or set up the Agent SDK.');
    process.exit(0);
  }

  let pass = 0;
  let fail = 0;
  for (const t of tasks) {
    process.stdout.write(`  ▸ ${t.id} (${t.skill}) ... `);
    const r = runTask(t);
    if (r.ok) { console.log('PASS'); pass++; }
    else { console.log('FAIL'); fail++; console.log(`      ${r.reason}`); }
  }

  console.log(`\nGolden: ${pass} passed, ${fail} failed`);
  process.exit(fail > 0 ? 1 : 0);
}

main();
