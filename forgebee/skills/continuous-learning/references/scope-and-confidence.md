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

## Privacy

- Observations stay **local** on your machine
- Project-scoped instincts are isolated per project
- Only instincts (patterns) can be exported — not raw observations
- No actual code or conversation content is shared
