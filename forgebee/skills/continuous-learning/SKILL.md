---
name: continuous-learning
description: Use when reviewing learned patterns from recent sessions, processing pending observations, or evolving repeated behaviors into reusable skills, commands, or agents.
version: 1.2.0
---

# Continuous Learning — Instinct-Based Architecture

## Objective

Turn session observations into reusable knowledge through atomic instincts — small learned behaviors with confidence scoring that persist across sessions. Project-scoped by default so React patterns stay in React projects and Python conventions stay in Python projects.

## When to Activate

- Reviewing pending instincts after a session of work
- Processing recent observations into named patterns
- Evolving repeated behaviors into full skills, commands, or agents
- Tuning confidence thresholds for learned behaviors
- Promoting a project-scoped instinct to global scope

## The Instinct Model

An instinct is a small learned behavior:

```yaml
---
id: prefer-functional-style
trigger: "when writing new functions"
confidence: 0.7
domain: "code-style"
source: "session-observation"
scope: project
project_id: "a1b2c3d4e5f6"
project_name: "my-react-app"
---

# Prefer Functional Style

## Action
Use functional patterns over classes when appropriate.

## Evidence
- Observed 5 instances of functional pattern preference
- User corrected class-based approach to functional
```

**Properties:**
- **Atomic** — one trigger, one action
- **Confidence-weighted** — 0.3 = tentative, 0.9 = near certain
- **Domain-tagged** — code-style, testing, git, debugging, workflow
- **Evidence-backed** — tracks observations that produced it
- **Scope-aware** — `project` (default) or `global`

## Process — Extracting an Instinct (the `/learn` loop)

Run this in-session; don't defer the whole judgment to the reference files. The references explain the storage model — these thresholds decide what becomes an instinct.

1. **Read the observation pool.** Pull from the project's `observations.jsonl` (see `references/architecture.md` for paths). Each row is a tool call with inputs/outputs/timestamps.
2. **Cluster by candidate pattern.** Group observations that share a trigger ("editing a test file", "writing a new function", "before a commit").
3. **Apply the extraction threshold.** A cluster only becomes an instinct when BOTH hold:
   - **≥3 observations** supporting the same action, AND
   - the observations span **≥2 distinct event types** (e.g., a tool-use pattern *and* a user correction; not 3 identical auto-logged edits). Single-event-type repetition is a habit of the tooling, not a learned preference.
   - **One exception:** an explicit user correction ("no, always do X instead") is worth ~3 observations on its own — a single correction can seed a tentative instinct.
4. **Assign a confidence tier** (mirrors `references/scope-and-confidence.md`):
   - **0.3 (tentative)** — 3 observations, one event type, or a single user correction. Suggested, not enforced.
   - **0.5 (moderate)** — 3-4 observations across ≥2 event types. Applied when relevant.
   - **0.7 (strong)** — 5+ observations across ≥2 event types, no contradicting evidence. Auto-approved for application.
   - **0.9 (near-certain)** — 8+ consistent observations, or 0.7 reinforced by an explicit user confirmation. Core behavior.
   - Each contradicting observation drops confidence one tier; two contradictions in a row retire the instinct.
5. **Pick scope.** Default `project`. Promote to `global` only per the Scope Decision Guide in the reference. Security, git, and tool-workflow patterns are global; language/framework/file-structure/style patterns stay project-scoped.
6. **Write the instinct** in the model shape above, with the `Evidence` block citing the observation count and the distinct event types that produced it.
7. **Surface for approval** — never activate without explicit user sign-off (see Never list). Below 0.7, present as a suggestion; at/above 0.7, present as auto-approvable but still confirm on first activation.

Below threshold (1-2 observations, or repetition within a single event type) → leave it in the pool. Don't manufacture an instinct from thin evidence; that's the noise this loop exists to filter out.

## Commands

| Command | Purpose |
|---------|---------|
| `/learn` | Analyze current session and extract patterns as instincts |
| `/evolve` | Cluster related instincts into skills/commands/agents |
| `/instinct-status` | Show all instincts (project + global) with confidence |
| `/instinct-export` | Export instincts (filterable by scope/domain) |
| `/instinct-import` | Import instincts with scope control |

## References

For deeper detail, see:
- `references/architecture.md` — observation flow, project detection, hooks, file structure
- `references/scope-and-confidence.md` — confidence tiers, scope decision guide, promotion rules, privacy

## Never

- Never activate instincts without explicit user approval
- Never mix project-scoped instincts across projects
- Never create instincts from one-time events (API outages, typos)
- Never export raw observations — only instincts (patterns)
