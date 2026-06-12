#!/usr/bin/env node
/**
 * secret-scan.js — Block commits/pushes that introduce hardcoded secrets.
 *
 * PreToolUse(Bash) hook. permission-guard gates secret *paths* (.env, .ssh); this
 * gates secret *content* in the diff being committed/pushed — the counterpart the
 * security-auditor / review-security agents imply but no hook enforced. Runs only
 * when the command is a git commit/push (fast exit otherwise), scans ADDED lines
 * for known key shapes, and blocks (exit 2) with an override path.
 *
 * Override a false positive: FORGEBEE_ALLOW_SECRET=1
 * Disable entirely:          FORGEBEE_DISABLE_SECRET_SCAN=1
 *
 * Best-effort: any internal error exits 0 (never wedge the user's git).
 */

const common = require('./_common.js');

const PATTERNS = [
  { kind: 'AWS access key id', re: /\bAKIA[0-9A-Z]{16}\b/ },
  { kind: 'Anthropic API key', re: /\bsk-ant-[A-Za-z0-9_-]{20,}/ },
  { kind: 'OpenAI-style API key', re: /\bsk-[A-Za-z0-9]{20,}\b/ },
  { kind: 'GitHub token', re: /\bgh[pousr]_[A-Za-z0-9]{20,}\b/ },
  { kind: 'Google API key', re: /\bAIza[0-9A-Za-z_-]{20,}\b/ },
  { kind: 'Slack token', re: /\bxox[baprs]-[A-Za-z0-9-]{10,}/ },
  { kind: 'Stripe live key', re: /\b[rs]k_live_[A-Za-z0-9]{16,}\b/ },
  { kind: 'Private key block', re: /-----BEGIN (?:RSA |EC |OPENSSH |DSA |PGP )?PRIVATE KEY-----/ },
  { kind: 'Hardcoded secret assignment', re: /(?:api[_-]?key|secret|token|passwd|password|access[_-]?token|client[_-]?secret)\s*[:=]\s*['"][A-Za-z0-9_\-./+=]{16,}['"]/i },
];

// Skip lines that are clearly placeholders / examples / test fixtures.
const PLACEHOLDER = /\b(example|placeholder|your[_-]?(api[_-]?)?key|xxxx+|changeme|dummy|sample|redacted|fake|test[_-]?key|<[^>]+>)\b/i;

function scanAddedLines(diff) {
  const hits = [];
  for (const line of diff.split('\n')) {
    if (!line.startsWith('+') || line.startsWith('+++')) continue; // only added content
    const body = line.slice(1);
    if (PLACEHOLDER.test(body)) continue;
    for (const p of PATTERNS) {
      const m = body.match(p.re);
      if (m) {
        const tok = m[0];
        const preview = tok.length > 14 ? `${tok.slice(0, 7)}…${tok.slice(-3)}` : tok;
        hits.push({ kind: p.kind, preview });
        break; // one hit per line is enough
      }
    }
  }
  return hits;
}

async function main() {
  if (process.env.FORGEBEE_DISABLE_SECRET_SCAN === '1') process.exit(0);

  const input = await common.readStdinJson();
  if (!input || input.tool_name !== 'Bash') process.exit(0);

  const cmd = (input.tool_input && input.tool_input.command) || '';
  const isCommit = /\bgit\b[^|;&]*\bcommit\b/.test(cmd);
  const isPush = /\bgit\b[^|;&]*\bpush\b/.test(cmd);
  if (!isCommit && !isPush) process.exit(0);

  if (!common.isGitRepo()) process.exit(0);

  // Commit: diff vs HEAD covers staged + `-a` auto-staged content.
  // Push: unpushed commits if an upstream exists, else the last commit.
  let diff = '';
  if (isCommit) {
    diff = common.runGit('diff --no-color HEAD') || '';
  } else {
    const ahead = common.runGit('rev-list --count @{u}..HEAD');
    diff = (ahead && Number(ahead) > 0)
      ? (common.runGit('diff --no-color @{u}..HEAD') || '')
      : (common.runGit('diff --no-color HEAD~1..HEAD') || '');
  }
  if (!diff) process.exit(0);

  const hits = scanAddedLines(diff);
  if (hits.length === 0) process.exit(0);

  if (process.env.FORGEBEE_ALLOW_SECRET === '1') {
    console.error('[secret-scan] FORGEBEE_ALLOW_SECRET=1 — allowing despite a potential secret.');
    process.exit(0);
  }

  console.error('BLOCKED: potential secret(s) in the changes you are about to commit/push (secret-scan):');
  const seen = new Set();
  for (const h of hits) {
    const key = `${h.kind}|${h.preview}`;
    if (seen.has(key)) continue;
    seen.add(key);
    console.error(`  ${h.kind}: ${h.preview}`);
    if (seen.size >= 10) break;
  }
  console.error('Move the secret to an env var / secret manager and remove it from the diff.');
  console.error('If this is a false positive, re-run with FORGEBEE_ALLOW_SECRET=1.');
  process.exit(2);
}

main().catch(() => process.exit(0));
