---
name: checkpoint-preview
description: Use after autonomous /workflow execution to walk the diff by concern (not by file) with risk-tagged hot spots — bridges agent autonomy to human judgment before debate or delivery.
version: 1.0.0
---

# Checkpoint Preview

## Objective

Bridge autonomous implementation back to human judgment by walking the diff **by concern** (cohesive design intents) rather than by file. Surface 2-5 high-blast-radius spots with risk tags so the reviewer can decide: ship, rework, or dig deeper.

Adapted from BMAD's bmad-checkpoint-preview.

## Why this exists

Code review has two failure modes:
- **Skim and miss:** reviewer scans the diff, nothing jumps out, approves
- **Lose the forest:** reviewer methodically reads every file but loses the thread

Both result in the same outcome — the review didn't catch the thing that mattered. The underlying issue is sequencing: a raw `git diff` presents changes in file order, which is almost never the order that builds understanding.

This skill makes the LLM do the reconstruction work — read the diff, spec, and surrounding codebase, then present the change in an order designed for comprehension.

## When this fires

- After `/workflow` Execute + Spec Compliance Check phases, **before** Code Debate (Large/Critical)
- After `/team` finishes dispatching specialists, before final review-all
- Whenever a user asks to "walk me through this diff" or "review this branch"

Skip when:
- User passes `--skip-checkpoint` to `/workflow`
- Changes are trivial (1-2 files, single concern)

## The 5 Steps

### 1. Orientation
Produce a one-line intent summary plus surface area stats:
```
Intent: Add user CSV export endpoint with date-range filter.
Stats: 8 files changed, 3 modules touched, 247 lines of logic added, 1 schema migration, 2 new public interfaces.
```

The reviewer confirms "yes, that's what I asked for" before reading any code.

### 2. Walkthrough by Concern (NOT by file)

Group the diff by cohesive design intent — "input validation", "API contract", "auth integration" — and present top-down (highest-level intent first, then supporting implementation). The reviewer never encounters a reference to something they haven't seen yet.

```markdown
### Concern 1: API contract (the user-facing interface)
The endpoint design was chosen for X reason. Trade-off: Y.
- `src/api/users/export.ts:14-32` — route definition
- `src/api/users/export.types.ts:1-22` — request/response shapes

### Concern 2: Input validation (defending the boundary)
Validation runs before any DB access. Date format is RFC3339.
- `src/api/users/export.ts:34-58` — validators
- `src/lib/validation/date-range.ts:1-40` — shared validator

### Concern 3: Streamed CSV generation (memory safety)
For large datasets we stream rather than buffer to avoid OOM.
- `src/api/users/export.ts:60-95` — stream pipeline
- `src/lib/csv/streaming.ts:1-50` — generic stream helper
```

### 3. Detail Pass (high-blast-radius hot spots)

Surface 2-5 spots where a mistake would have the highest blast radius. Tag by risk category:

- `[auth]` — auth middleware, sessions, login, JWTs, passwords
- `[schema]` — migrations, model defs, RLS policies
- `[billing]` — Stripe/Paddle hooks, subscription state, invoices
- `[public API]` — REST routes, GraphQL schema, OpenAPI
- `[security]` — input validation, sanitization, file uploads, eval/exec
- `[data-loss]` — delete operations, irreversible writes, hard-delete migrations
- `[perf]` — query loops, N+1, large allocations

Ordered by what breaks worst if wrong, not by file position.

```markdown
### Hot Spots
1. `[public API]` `src/api/users/export.ts:42` — auth check uses `req.user.id` but middleware sets `req.user` only after auth. Path with expired-token returns 200 with empty CSV instead of 401. Worst case: silent data exposure if client doesn't check.
2. `[data-loss]` `migrations/2026_05_19_export_log.sql:8` — DROP TABLE in down-migration. If rollback runs, audit log lost. Recommend keep down-migration empty or rename instead.
3. `[perf]` `src/lib/csv/streaming.ts:32` — buffer fills before flush only when stream backpressure triggers; on slow consumers, memory still grows. Add hard limit.
```

### 4. Adversarial Findings Surface (if Code Debate ran)

If Code Debate has already run on this work, surface unresolved Skeptic concerns — not the bugs that were fixed, but the decisions the review loop flagged that the reviewer should be aware of.

### 5. Verdict Prompt

```markdown
### Verdict
- [ ] Ship — design is sound, hot spots understood, accept the trade-offs
- [ ] Rework — one or more hot spots need to be addressed before ship
- [ ] Dig deeper — request a focused review on a specific area
```

## Output Shape

Single message with the 5 sections in order. No file dumps — only the concerns and hot spots.

## Never

- Never present changes in file order — concern order only
- Never list more than 5 hot spots (forces real prioritization)
- Never report bugs that are already fixed in the diff — those are noise
- Never substitute for review-all or Code Debate — this is a human-handoff layer, not a quality gate
- Never produce a verdict yourself — the human picks ship / rework / dig deeper
