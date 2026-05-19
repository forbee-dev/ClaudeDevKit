---
name: continuous-learning
description: Use when reviewing learned patterns from recent sessions, processing pending observations, or evolving repeated behaviors into reusable skills, commands, or agents.
version: 1.1.0
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
