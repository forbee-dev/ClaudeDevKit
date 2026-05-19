---
name: brainstorming
description: Use when invoking /workflow --strict, /plan, or "brainstorm before building" — turns an idea into a written, approved design spec before any implementation.
version: 1.0.0
---

# Brainstorming — Idea to Design Spec (Opt-In)

## Objective

Turn a feature idea into a written, approved design spec at `docs/planning/specs/YYYY-MM-DD-<topic>-design.md` **before** any implementation skill (`/workflow`, `/team`, code generation) is allowed to proceed.

## Karpathy Principle (P3 — YAGNI Timing)

The design must solve **today's problem simply, not tomorrow's prematurely.** Reject options that:
- Add abstraction for hypothetical future needs
- Configure flexibility no one asked for
- Anticipate scenarios that may never happen
- Handle errors that can't occur given the boundary

If the user wants flexibility they will ask for it. Default to the minimum spec that solves what was asked.

## When this fires

This skill is **opt-in** in ForgeBee. It activates only when:

1. User runs `/workflow --strict` (strict mode requires a written spec)
2. User runs `/plan` for the design-first phase
3. User explicitly asks to "brainstorm before building", "design first", or similar

The default `/workflow` and `/team` flows do NOT require this gate — they go straight to planning + execution. Strict mode is for changes where unexamined assumptions could waste meaningful work (multi-system integrations, new product surfaces, architecture-touching features).

## Hard Gate (when invoked)

<HARD-GATE>
Do NOT invoke any implementation skill, write any code, scaffold any project, or take any implementation action until you have:
1. Presented a design
2. The user has approved it
3. The design is written to `docs/planning/specs/YYYY-MM-DD-<topic>-design.md`
4. The file is committed (or staged if user prefers a single commit at the end)

This applies regardless of perceived simplicity. The design can be short for truly simple projects, but it MUST exist on disk and be approved.
</HARD-GATE>

## Anti-Pattern: "This Is Too Simple To Need A Design"

Strict mode exists for the cases where unexamined assumptions cause the most wasted work. If you genuinely believe the change is too simple to need a spec, the user shouldn't have invoked strict mode — push back and ask them to confirm. Don't silently skip the gate.

## Checklist

Track these as tasks and complete in order:

1. **Explore project context** — check the relevant files, recent commits, existing patterns
2. **Decompose if needed** — if the request spans multiple independent subsystems (e.g., "a platform with chat + billing + analytics"), call this out *before* refining details. Help the user choose which sub-project to design first; each sub-project gets its own spec → plan → execute cycle
3. **Ask clarifying questions, one at a time** — purpose, constraints, success criteria, edge cases, non-goals. Prefer multiple-choice when possible
4. **Propose 2–3 approaches** with trade-offs and a recommended one
5. **Present the design section by section** — get incremental approval, don't dump a wall of text
6. **Write the spec** to `docs/planning/specs/YYYY-MM-DD-<topic>-design.md`
7. **Self-review the spec** — placeholders, contradictions, ambiguity, scope creep
8. **User reviews the written spec** — explicitly ask them to read it
9. **Transition to implementation** — hand off to `/plan`, `/workflow`, or `/team`

## Spec Template

```markdown
# <Topic> Design Spec

**Date:** YYYY-MM-DD
**Status:** Draft | Approved | Implemented
**Owner:** <name>

## Problem
<1-2 paragraphs: what is broken, missing, or aspired to>

## Non-Goals
<bullets: what this explicitly does NOT do>

## Approach
<chosen approach, why it beat alternatives>

## Architecture
<diagrams, components, data flow, contracts>

## Open Questions
<things to resolve before/during implementation>

## Out of Scope (deferred)
<future work that's adjacent but not now>

## Acceptance
<concrete signals that "done" has been reached>
```

## Self-Review Checklist (before handing to user)

- [ ] No `TODO`, `TBD`, or `<placeholder>` left in the doc
- [ ] No two sections contradict each other (e.g., approach says X, architecture assumes not-X)
- [ ] Every "we should" or "we will" has a concrete shape attached
- [ ] Scope: the doc describes one thing, not three things stapled together
- [ ] Acceptance criteria are testable, not vibes ("works well" is not testable)

## Handoff

When the spec is approved and committed:

1. Stop further brainstorming. Do not re-litigate.
2. Invoke `/plan` (or directly `/workflow` if user asked for full pipeline) and pass the spec path as context.
3. The downstream skill assumes the spec is authoritative. Disagreements come back as a new conversation, not silent scope changes.

## Why this skill is opt-in

ForgeBee's default flow is fast: `/workflow` and `/team` skip directly to planning + execution because most changes don't benefit from a separate design phase. The gate exists for the changes where they DO benefit — and only the user knows when that is.

If you find yourself wishing this gate were on by default, raise it as a `/learn` candidate. Don't promote it unilaterally.

## Never

- Never start coding before the spec is on disk and approved
- Never argue with strict mode — the user opted in for a reason
- Never write the spec without the user-approval step
- Never produce a "design" that is just a list of files to create
