---
name: surface-ambiguity
description: Use when about to make a non-trivial choice with multiple valid interpretations — forces listing of options and the chosen one with rationale. Catches silent picks.
version: 1.0.0
---

# Surface Ambiguity

## Objective

Prevent silent picks. Before any non-trivial implementation choice with 2+ valid interpretations, list the options and pick one with a one-line reason. Do NOT silently choose.

From Karpathy's diagnosis of LLM coding failure modes (`/tmp/karpathy-analysis/README.md:15`):
> "They make wrong assumptions on your behalf and just run along with them without checking. They don't manage their confusion, don't seek clarifications, don't surface inconsistencies, don't present tradeoffs."

This sits between `brainstorming` (upfront, formal) and the debate triads (post-plan, formal). It catches mid-stream silent picks — agent reads "export users" and silently chooses JSON, all-users, file-on-disk.

## When this fires

- A user request has more than one reasonable read (format, scope, fallback, library, location)
- A sub-task starts a thread that ends in implementation details not in the original ask
- Naming, defaults, error semantics, or boundary conditions are about to be picked silently
- About to choose between two libraries, two patterns, two locations, or two interpretations of the spec

## Output shape (mandatory)

```markdown
**Interpretations considered:**
1. Option A — [one-line description]
2. Option B — [one-line description]
3. (optional) Option C — [one-line description]

**Chosen:** Option B
**Why:** [one-line rationale tying choice to the user's request]
**Reversible?** Yes / No

If No: surface to user and get approval BEFORE proceeding.
```

## Examples of triggering moments

| Situation | Silent pick (bad) | Surface (good) |
|---|---|---|
| "Add user export" | Silently choose JSON | List JSON / CSV / both, pick one with reason |
| "Handle the error" | Silently swallow | List swallow / log / throw / retry, pick one |
| "Use a queue" | Silently choose Redis | List Redis / Postgres / SQS, pick one |
| "Make it configurable" | Silently add 5 knobs | List which configs and why each is needed |
| "Match the existing pattern" | Silently pick one of many existing patterns | List 2-3 patterns observed, pick the closest fit |

## Never

- Never silently pick when 2+ valid reads exist
- Never list interpretations *after* picking — list before
- Never list 4+ options (decompose the question if you need that many)
- Never use this for trivial choices (variable names, brace style — not ambiguity, that's style)
- Never use the output shape as a delay tactic — pick quickly and continue
