#!/usr/bin/env node
/**
 * learn-nudge.js — Surface a one-line nudge on SessionStart when pending
 * learning instincts have piled up and /learn hasn't been run recently.
 *
 * Triggers when:
 *   - .claude/learnings/pending-instincts.jsonl has >= NUDGE_THRESHOLD active entries
 *   - last nudge was > NUDGE_COOLDOWN_HOURS ago (default 24h)
 *
 * Does NOT block the session. Emits a single line via additionalContext.
 *
 * Addresses the common pain point: users forget to invoke /learn manually
 * because the system is silent until prompted.
 */

const fs = require('fs');
const path = require('path');
const { getProjectDir, output, safeWriteFlag } = require('./_common.js');

const NUDGE_THRESHOLD = 5;          // min pending instincts to nudge
const NUDGE_COOLDOWN_HOURS = 24;    // throttle: at most once per N hours

function main() {
  try {
    const projectDir = getProjectDir();
    const pendingFile = path.join(projectDir, '.claude', 'learnings', 'pending-instincts.jsonl');
    const throttleFile = path.join(projectDir, '.claude', 'learnings', '.last-nudge');

    if (!fs.existsSync(pendingFile)) {
      process.exit(0);
    }

    // Count active pending instincts (skip rejected)
    const content = fs.readFileSync(pendingFile, 'utf8');
    const lines = content.split('\n').filter(l => l.trim().length > 0);
    let activeCount = 0;
    let highConfidenceCount = 0;
    for (const line of lines) {
      try {
        const entry = JSON.parse(line);
        if (entry.status === 'rejected') continue;
        if (entry.status === 'active') continue;
        activeCount += 1;
        if ((entry.confidence || 0) >= 0.5) highConfidenceCount += 1;
      } catch {
        // malformed line, skip
      }
    }

    if (activeCount < NUDGE_THRESHOLD) {
      process.exit(0);
    }

    // Throttle: skip if nudged recently
    if (fs.existsSync(throttleFile)) {
      try {
        const lastNudge = parseInt(fs.readFileSync(throttleFile, 'utf8').trim(), 10);
        const hoursSince = (Date.now() - lastNudge) / (1000 * 60 * 60);
        if (hoursSince < NUDGE_COOLDOWN_HOURS) {
          process.exit(0);
        }
      } catch {
        // invalid throttle file, proceed
      }
    }

    // Record this nudge (symlink-refusing write)
    const writeResult = safeWriteFlag(throttleFile, String(Date.now()));
    if (!writeResult.ok) {
      // non-fatal — nudge anyway, but log the refusal reason
      try { fs.appendFileSync(path.join(projectDir, '.claude', 'logs', 'hook-errors.log'), `[learn-nudge] safeWriteFlag refused: ${writeResult.error}\n`); } catch {}
    }

    const hint = highConfidenceCount > 0
      ? ` (${highConfidenceCount} high-confidence)`
      : '';

    const nudge = `💡 ${activeCount} pending learning instincts${hint} — run \`/learn\` when you have a moment to review and activate them.`;

    output({
      hookSpecificOutput: {
        hookEventName: 'SessionStart',
        additionalContext: nudge,
      },
    });
  } catch (e) {
    // Never block session start — fail silent
    process.exit(0);
  }
}

main();
