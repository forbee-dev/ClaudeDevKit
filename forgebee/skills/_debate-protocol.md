# Debate Protocol (shared spine)

> Shared rules for all ForgeBee adversarial debates: requirements (`/workflow` planning),
> code (`/workflow` code phase), and strategy (`/growth`). Each debate skill points here
> for the common spine and keeps only its domain-specific payload in its own `SKILL.md`.
> When this file and a skill disagree on a rule, **this file wins** — do not maintain a
> parallel copy of these rules that can drift.

## Roles

A debate has three roles, each running in its own forked context (`context: fork`):

- **Advocate** — argues FOR the artifact. Builds the strongest honest case that it is ready.
- **Skeptic** — argues AGAINST the artifact. Finds the gaps, bugs, risks, and weak points.
- **Judge** — reads both blind cases and rules. Verifies claims independently.

## Blind-Debate Rules

1. **Advocate and Skeptic argue blind.** Neither sees the other's case. They reason
   from the artifact and the codebase/market only — never from each other.
2. **One argument per item.** No rebuttals, no back-and-forth. You get one shot per item;
   lead with your strongest point.
3. **Evidence beats rhetoric.** Every claim must cite something concrete — `file:line`,
   an acceptance criterion, a market signal, a competitor example. "It's fine" / "it's weak"
   with no reference is worthless to the Judge.
4. **Argue honestly.** Advocates concede real weaknesses; Skeptics concede when something
   is genuinely clean. Calibration (your own confidence/severity) is part of the deliverable.
5. **Stay in your lane.** Argue about the artifact's quality. Do not rewrite it, redesign
   the system, or make the decision yourself — that is the Judge's and the user's job.

## Verdict Lattice

Each role has its own verdict vocabulary. They are NOT symmetric — an Advocate can decline
to defend, and a Skeptic can affirm something is clean.

**Advocate** (one per item):
- **APPROVE** — strong case; the artifact is ready as-is.
- **APPROVE-WITH-CAVEATS** — ready to proceed, but with named limitations the Judge should weigh.
- **CANNOT-DEFEND** — after honest review, no credible case for readiness exists. This is a
  signal to the Judge as strong as any Skeptic BLOCK — say it plainly rather than manufacturing a defense.

**Skeptic** (one per item):
- **BLOCK** — a concrete, specific problem that should stop the artifact from proceeding.
- **FLAG** — a real concern that can be tracked and proceeded past, not a stopper.
- **CLEAN** — after rigorous review, no significant concern found. Affirming clean is honest
  and expected for genuinely solid items; do not invent issues to seem rigorous.

**Judge** (one per item) — maps both blind cases onto the final ruling:
- **APPROVE** — proceed. Advocate's case holds, or Skeptic's concerns aren't material.
- **FLAG** — proceed with acknowledged risk; create a tracked follow-up.
- **BLOCK** — do not proceed; specific changes required before re-debate.

Verdict-mapping defaults (Judge):
- Advocate CANNOT-DEFEND, or Skeptic BLOCK with concrete evidence → lean **BLOCK**.
- Advocate APPROVE-WITH-CAVEATS, or Skeptic FLAG → lean **FLAG**.
- Advocate APPROVE + Skeptic CLEAN → **APPROVE**.
- Both sides weak / both sides strong → **FLAG** with a note; surface the tradeoff to the user.

## Severity Scale (CLAUDE.md P6 — single standard)

Use this vocabulary everywhere. Do NOT introduce alternates (Warning/Suggestion/etc.).

- **Critical** — blocks merge/execution; will fail or cause harm if unaddressed.
- **High** — must fix before the next sprint/iteration; materially degrades the outcome.
- **Medium** — fix when convenient; the artifact works without it.
- **Low** — nice-to-have; perfectionism.

## Judge Input Contract

For each debated item the Judge receives, and must read in full before ruling:
1. The original artifact (requirement/story + acceptance criteria, code diff + criteria,
   or strategy artifact) under debate.
2. The **Advocate's** blind case — with its verdict and strength/confidence rating.
3. The **Skeptic's** blind case — with its verdict, severity rating, and proposed fix.

The Judge verifies independently (reads the code, checks the criteria, tests the market claim)
rather than trusting either side's assertion.

## Escalation Rules (Judge)

- **Low/Medium severity** → rule and move on; the decision stands unless the user overrides.
- **High/Critical severity** → rule AND escalate to the user with full context; the ruling is a recommendation, the user has final authority.
- All **BLOCK** items are compiled into an escalation report regardless of severity.

## Blindness-Leak Guard (Judge)

The Judge must police the integrity of the blind debate. If **either** case references,
quotes, anticipates, or rebuts the **other** side ("as the Skeptic will surely claim…",
"contrary to the Advocate…"), the blind constraint has leaked:
- **Flag the leak explicitly** in the ruling for that item.
- **Discount** the leaked portion — it was not produced under blind conditions.
- Rule on the artifact on the strength of the clean, non-leaked evidence only.
