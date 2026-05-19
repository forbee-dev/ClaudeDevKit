---
name: terse-report
description: Use when reporting back to an orchestrator (/workflow, /team) rather than directly to the user — emit telegraphic format that preserves code/citations exact while dropping prose filler. Cuts ~65% of report tokens.
version: 1.0.0
---

# Terse-Report Mode

## Objective

When a specialist agent reports back to an orchestrator (not a human), emit a compressed report. Orchestrators only consume structured signal (status, files changed, concerns, verification evidence) — verbose prose between those is wasted context.

Adapted from caveman's compression rules. Same rules drive `/learn` memory compression (W8) — one source of truth for compression discipline.

## When this fires

The skill is invoked by sub-agents when the orchestrator sets `responseStyle: "orchestrator"` in the JSON handoff contract.

- `/workflow` and `/team` set `responseStyle: "orchestrator"` on every dispatch.
- Direct invocations (e.g., `/security` called by the user) do NOT set this — agents emit verbose, human-readable output as usual.

If `responseStyle` is absent, default to verbose. Terse is opt-in by the caller.

## Compression Rules

### Drop (prose filler)
- Articles: `the`, `a`, `an`
- Filler: `actually`, `basically`, `essentially`, `literally`, `simply`, `just`, `really`, `very`
- Verbose hedges: `in order to` → `to`, `it should be noted that` → drop
- Pleasantries: `of course`, `naturally`, `obviously`, `clearly`
- Self-narration: `I noticed that`, `I observed that`, `I'd like to mention`

### Preserve EXACTLY (never compress)
- Code blocks (fenced or inline)
- File paths, line refs (`src/api.ts:42`)
- ISO dates, URLs, commit hashes (7+ hex)
- Error messages and stack frames (quoted verbatim)
- The status field and its enum value (`DONE | DONE_WITH_CONCERNS | BLOCKED | NEEDS_CONTEXT`)
- Configuration keys, env var names
- Test output, command output

### Prefer
- Bullet lists over prose paragraphs
- One line per concern, not a paragraph
- Fragments OK — full sentences not required
- Direct verbs ("added X" not "I went ahead and added X")

## Example

**Verbose (~340 tokens):**
```
I've completed the implementation of the user export endpoint as specified
in the requirements document. The endpoint is located at src/api/users/export.ts
and supports filtering by date range as requested. I've also added comprehensive
error handling for edge cases such as empty result sets and database timeouts.
All 14 tests in the test suite are passing, including 5 new tests I wrote
specifically for this feature. I noticed that the existing pagination utility
in src/lib/pagination.ts could benefit from refactoring but that's outside
the scope of this story so I left it alone.

Status: DONE
```

**Terse (~120 tokens):**
```
Status: DONE
- src/api/users/export.ts: new endpoint, date-range filter
- Edge cases: empty results, DB timeout — handled
- Tests: 14/14 pass (5 new for this feature)
- Out of scope: src/lib/pagination.ts could be refactored, left alone
- Self-review: no N+1, no secrets, input validated, no auth bypass
```

## Output Shape (orchestrator mode)

```
Status: <STATUS>

## Changes
- <file:line>: <one-line description>
- <file:line>: <one-line description>

## Verification
- <test/check>: <result>
- <test/check>: <result>

## Concerns (only if DONE_WITH_CONCERNS)
- <concern 1>
- <concern 2>

## Self-Review
- <check>: <pass/finding>
- <check>: <pass/finding>
```

## Never

- Never compress code blocks or citations — exact preservation is non-negotiable
- Never compress when `responseStyle` is not `orchestrator` — user-facing output stays verbose
- Never omit the Status line — orchestrators parse for it
- Never reword error messages — quote them exactly
- Never drop scope deviations — flag them under Concerns
