---
name: audit-self
description: Use to re-run the ForgeBee self-audit on demand — scores every skill, agent, and command against the scorecard. Writes timestamped findings and surfaces regressions since the last run.
version: 1.0.0
---

# Audit Self

## Objective

Re-run the same scorecard that produced the 4 manual audit files (`docs/planning/audit-*.md`) on demand. Catch regressions: new agents missing status protocol, new skills with WHAT-first descriptions, bloat creeping back, severity vocabulary drift, etc.

Writes findings to `docs/planning/audit-YYYY-MM-DD.md` (timestamped, never overwriting). Surfaces only NEW issues since the most recent prior audit — regression detection, not full-state report.

## When this fires

- User invokes `/audit-self` explicitly
- Before a version bump (e.g., 5.1 → 5.2) — recommended manual step
- `learn-nudge.js` may surface a hint if last audit was > 60 days ago and the project has changed substantially

## Scorecards

The three scorecards live in `scorecards/`:
- `scorecards/skills-scorecard.md` — 9 questions per skill
- `scorecards/agents-scorecard.md` — 10 questions per agent
- `scorecards/commands-scorecard.md` — 9 questions per command + cross-cutting

Read these BEFORE auditing. They are the canonical rubric.

## Process

### Step 1: Inventory
- List all skills in `forgebee/skills/` (count)
- List all agents in `forgebee/agents/` (count)
- List all commands in `forgebee/commands/` (count)
- Compare to prior audit counts — flag added/removed

### Step 2: Score against rubrics
For each item, apply the appropriate scorecard. Focus detail on problematic items (most should be FINE). Use the same Y/N + concrete-finding format as the manual audits.

### Step 3: Cross-cutting checks
- Status protocol present in all agents? (regression on Bucket X1)
- Karpathy principles present in code-producing agents? (regression on W9)
- Severity vocabulary standardized in review skills? (regression on W9 P6)
- Prompt defense baseline present in all agents? (regression on W13)
- Description format "Use when..." across all skills? (regression on 5.0 audit)

### Step 4: Regression detection
- Read most recent prior `docs/planning/audit-*.md` (or audit-skills.md / audit-agents-*.md / audit-commands.md if no timestamped one exists)
- For each prior issue: is it still present? Flag fixed and unfixed
- For each current issue: did it exist in the prior audit? Flag NEW issues prominently

### Step 5: Write findings
Output to `docs/planning/audit-YYYY-MM-DD.md`:

```markdown
# ForgeBee Self-Audit (YYYY-MM-DD)

## Inventory Delta vs Prior Audit
- Skills: 25 → N (Δ +M added, -K removed)
- Agents: 48 → N (Δ +M / -K)
- Commands: 33 → N (Δ +M / -K)

## Regressions (NEW issues since last audit)
- <prioritized list, with file:line>

## Fixed (issues from last audit, now resolved)
- <list>

## Persistent Issues (unfixed)
- <list>

## Cross-Cutting Health
- Status protocol coverage: N/M agents
- Karpathy P1+P4 coverage: N/M code-producing agents
- Severity vocabulary standardized: Y/N
- Prompt defense baseline: N/M agents
- "Use when..." descriptions: N/M skills

## Top 10 Concrete Fixes (prioritized)
1. <file:line — issue — fix>
2. ...

## Snapshot for next audit
- Total skills: N
- Total agents: N
- Total commands: N
- Audit timestamp: YYYY-MM-DD
```

## Never

- Never overwrite a prior audit file — always timestamped
- Never report on every fine item — focus on problematic ones (cap detail at top-20)
- Never propose fixes outside the audit's scope — recommend, don't implement
- Never skip the regression step — that's the main value
- Never score the audit's own files (self-reference loop)
