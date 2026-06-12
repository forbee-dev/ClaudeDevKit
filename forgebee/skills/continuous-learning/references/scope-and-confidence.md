# Continuous Learning — Scope & Confidence Reference

How instincts are scored, scoped, and promoted between project and global.

## Confidence Scoring

| Score | Meaning | Behavior |
|-------|---------|----------|
| 0.3 | Tentative | Suggested but not enforced |
| 0.5 | Moderate | Applied when relevant |
| 0.7 | Strong | Auto-approved for application |
| 0.9 | Near-certain | Core behavior |

## Scope Decision Guide

| Pattern Type | Scope | Examples |
|-------------|-------|---------|
| Language/framework conventions | **project** | "Use React hooks", "Follow Django REST patterns" |
| File structure preferences | **project** | "Tests in __tests__/", "Components in src/components/" |
| Code style | **project** | "Use functional style", "Prefer dataclasses" |
| Security practices | **global** | "Validate user input", "Sanitize SQL" |
| General best practices | **global** | "Write tests first", "Always handle errors" |
| Tool workflow preferences | **global** | "Grep before Edit", "Read before Write" |
| Git practices | **global** | "Conventional commits", "Small focused commits" |

## Instinct Promotion (Project → Global)

When the same instinct appears in 2+ projects with average confidence ≥ 0.8, it's a candidate for global promotion. Run `/evolve` to see promotion candidates.

## Conflict Resolution (instinct vs instinct)

Promotion creates a real collision path: a project instinct and a global instinct can fire on the **same trigger with opposing actions** (e.g. project `prefer class components` @0.7 vs global `prefer functional style` @0.7). Resolve in this order:

1. **Higher confidence wins.** The more-reinforced instinct applies.
2. **On a confidence tie, narrower scope wins.** A project instinct beats a global one — project context is more specific than a cross-project default.
3. **If still tied** (same confidence, same scope), do **not** silently pick. Surface the conflict at `/instinct-status` and apply neither until the user resolves it — mirrors the framework's `surface-ambiguity` philosophy (never make a silent choice between equally-valid options).

A losing instinct is **not** retired — it stays scoped to where it's valid (the project instinct still governs its own project). Conflict resolution decides which one *applies in the current context*, not which one survives.

## Privacy

- Observations stay **local** on your machine
- Project-scoped instincts are isolated per project
- Only instincts (patterns) can be exported — not raw observations
- No actual code or conversation content is shared
