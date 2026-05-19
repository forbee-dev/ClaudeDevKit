---
name: investigate
description: Use when handed a crash log, stack trace, or "this used to work" complaint — produces a structured case file with evidence-graded findings before any code changes. Complements debugger-detective (which fixes).
version: 1.0.0
---

# Investigate

## Objective

Take an unexplained symptom, produce a structured case file another engineer can pick up cold. **Diagnosis only — no fixes.** Hand off the case file to `debugger-detective` for the actual fix.

Adapted from BMAD's bmad-investigate forensic discipline.

## Why this exists separate from `/debug`

Normal debugging blends three things — looking at evidence, reasoning about cause, changing code to test the theory. When they're blended, two failure modes show up:

- **Narrative lock-in:** the first plausible story becomes the working theory; every observation gets bent to fit. Bug stays unfixed until someone gives up and starts over.
- **Evidence amnesia:** you traced something, ruled it out, but didn't write down why. Two days later, with fresh eyes, you (or a colleague) trace the same dead end.

Investigation is its own discipline because it forces the evidence step to complete before the fix step starts.

## The Iron Discipline

### 1. Stronghold First
Investigation never starts from a theory. It starts from **one piece of confirmed evidence** and expands outward. That evidence might be a specific error message, a stack frame, or a timestamped log entry.

If you don't have a stronghold, stop. Ask the user for one piece of concrete evidence — exact error text, exact log line, exact stack frame — before proceeding.

### 2. Evidence Grading

Every finding gets one of three grades:

- **Confirmed.** Directly observed in logs, code, or dumps. Cite with `path:line`, log timestamp, or commit hash. If someone asks "how do you know?", you point at the citation.
- **Deduced.** Logically follows from confirmed evidence. The reasoning chain is shown. If a step in the chain is wrong, the deduction is wrong, and you can see exactly which step.
- **Hypothesized.** Plausible but unconfirmed. Declares upfront what evidence would confirm or refute it. Hypotheses are explicitly *not facts*.

### 3. Never Erase Hypotheses

Wrong theories stay in the case file with status updated to `Refuted by F-NNN` (citing the confirmed finding that refuted it). Future investigators see the dead ends — and don't re-run them. This is the antidote to evidence amnesia.

## Output: Case File

Write to `docs/planning/investigations/YYYY-MM-DD-<topic>.md`. Use the template at `forgebee/templates/investigation-case-file.md` (created alongside this skill — see below).

Case file shape:

```markdown
# Investigation: <symptom or ticket>

**Opened:** YYYY-MM-DD
**Stronghold evidence:** <one piece of confirmed evidence with citation>

## Confirmed
- F-001: <fact> — cite: <path:line / log / commit>

## Deduced
- D-001: <conclusion>
  Reasoning: F-001 → therefore X → therefore D-001
  (If any step wrong, deduction wrong)

## Hypothesized
- H-001: <plausible explanation>
  Would confirm: <observable check>
  Would refute: <observable check>
- H-002 [REFUTED YYYY-MM-DD by F-003]: <plausible-but-refuted explanation>
  Refuted because: F-003 showed X

## Next Steps (diagnostic only — not fixes)
- <next observation to gather>
- <next experiment to run>

## Handoff
When stronghold is established and hypothesis is testable: hand the case file to `debugger-detective` for the fix.
```

## Process

1. **Acknowledge the symptom.** Quote it back to the user verbatim — confirms you have it right.
2. **Establish stronghold.** Ask for or extract one piece of confirmed evidence.
3. **Open the case file.** Create `docs/planning/investigations/YYYY-MM-DD-<topic>.md` from the template.
4. **Gather confirmed findings.** Read logs, code, git history. Each finding gets a citation.
5. **Build deduced findings.** Each deduction names the confirmed findings it rests on.
6. **List hypotheses with confirm/refute conditions.** No fewer than 2, no more than 5.
7. **Pick the highest-leverage next observation.** Not a fix — an observation that would confirm or refute the strongest hypothesis.
8. **Update the file as observations come back.** Promote H-NNN to F-NNN when confirmed. Mark refuted ones with status update (never delete).
9. **When a hypothesis becomes a confirmed finding with a clear fix:** hand the case file to `debugger-detective`. The fix is a separate handoff.

## Never

- Never start from a theory — start from one confirmed piece of evidence
- Never delete a hypothesis — mark it refuted and keep it in the file
- Never write a fix during investigation — diagnosis only
- Never grade a finding higher than the evidence supports (Confirmed needs citation; Deduced needs chain)
- Never skip the case file — the artifact IS the deliverable; chat summaries are not authoritative
- Never hand off to `debugger-detective` without a clear hypothesis to test
