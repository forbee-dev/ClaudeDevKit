---
name: elicitation
description: Use after producing a plan or design to stress-test it via a named method (Pre-mortem, Red Team, Inversion, Stakeholder Round Table, etc.) — applies to OUTPUT, not requirements.
version: 1.0.0
---

# Elicitation — Stress-Test Your Own Output

## Objective

After producing a plan, design, or architecture decision, apply one of 18 named reasoning methods to challenge it. Different from `brainstorming` (which runs upfront on the idea) and from debate triads (which run on the agreed requirements). **Elicitation runs on the artifact** — your own output, looked at through a fresh lens.

Adapted from BMAD's bmad-advanced-elicitation skill + methods catalog.

## Why this exists

Karpathy's diagnosis quoted in CLAUDE.md P2: agents don't surface tradeoffs, don't push back when they should. The brainstorming and debate ceremonies catch some of this at phase boundaries. Elicitation catches it on individual artifacts mid-flow — after the architect produces an ADR, before it ships.

## When this fires

- User invokes `/elicit` explicitly, optionally with a method name (e.g., `/elicit pre-mortem`)
- `/workflow` auto-offers 2-3 relevant methods at the end of Plan and Architect phases
- The agent itself recognizes it's about to commit to a heavy decision and surfaces the method library

## Method Catalog

The full catalog lives in `methods.csv` (18 methods across 7 categories). Categories:

| Category | Methods | Best for |
|---|---|---|
| **Inversion** | Pre-mortem, Inversion, Five Whys | Risk surfacing, debugging |
| **Collaboration** | Stakeholder Round Table, Cross-Functional War Room, Mentor and Apprentice, Good Cop Bad Cop | Multi-stakeholder concerns |
| **Competitive** | Red Team vs Blue Team, Shark Tank Pitch, Code Review Gauntlet | Adversarial hardening |
| **Advanced** | Tree of Thoughts, Self-Consistency Validation, Meta-Prompting Analysis | Multi-path reasoning |
| **Temporal** | Time Traveler Council | Long-term vs short-term tradeoffs |
| **Narrative** | Customer Support Theater | UX pain surfacing |
| **Analytical** | Stakeholder Pain Map, Constraint Relaxation, Cost of Delay | Structured analysis |

Read `methods.csv` for the full list with descriptions, output patterns, and when-to-use guidance.

## Process

### `/elicit` with no args
1. List the 18 methods grouped by category
2. Recommend 2-3 based on the most recent artifact in the conversation
3. Let user pick one (or run a different one)

### `/elicit <method-name>` (e.g., `/elicit pre-mortem`)
1. Resolve the method: lowercase + hyphenate the slug and fuzzy-match it against the `method_name` column in `methods.csv` (e.g. `red-team` → "Red Team vs Blue Team", `shark-tank` → "Shark Tank Pitch", `five-whys` → "Five Whys", `stakeholder-round-table` → "Stakeholder Round Table"). On no match or an ambiguous match, list the candidate methods and ask — never silently pick.
2. Identify the target artifact (most recent plan / spec / decision in the conversation)
3. Apply the method to that artifact following its output pattern
4. Output: structured findings + concrete actions to take

### Auto-offer at workflow phase boundaries
When `/workflow` finishes Plan or Architect phase, surface inline:
```
Want to stress-test this before moving on? Try:
- `/elicit pre-mortem` — assume the project failed; what went wrong?
- `/elicit stakeholder-round-table` — gather PM/engineer/security perspectives
- `/elicit red-team` — find the attack surface

Or skip and continue.
```

User picks one or skips. Skip is the default — elicitation is a tool, not a gate.

## Output Shape

Every method returns:

```markdown
## Elicitation: <Method Name>

**Applied to:** <artifact name + path>

### Findings
- <finding 1, scored or qualitative per the method's output pattern>
- <finding 2>
- <finding 3>

### Concrete Actions
- [ ] <specific change to the artifact>
- [ ] <specific risk to mitigate>
- [ ] <specific question to resolve before proceeding>

### Verdict
<one-line summary: artifact survives this method / needs revision / needs discussion>
```

## Method Pairing Guidance

Not every method pairs well. Some are redundant; some complement each other:

**Recommended pairs (run both for high-signal coverage):**
- `pre-mortem` + `red-team` → forward-looking risk + adversarial probe
- `stakeholder-round-table` + `inversion` → different perspectives + flip-the-question
- `five-whys` + `meta-prompting` → drill down + step back
- `tree-of-thoughts` + `self-consistency-validation` → explore + verify

**Mutually exclusive (redundant — pick one):**
- `pre-mortem` and `inversion` (both invert the success/failure framing)
- `red-team` and `shark-tank` (both adversarial; red-team for technical, shark-tank for business)
- `stakeholder-round-table` and `cross-functional-war-room` (both multi-persona; war-room narrower to PM/eng/design)

**Hard limit:** at most **2 methods per artifact**. After 2, returns diminish — the artifact is either understood enough to ship or fundamentally needs a different approach (rewrite, not re-elicit). If asked to run a 3rd method on the same artifact, refuse: "Two methods applied — third returns diminishing signal. Ship, rework, or re-plan."

## Never

- Never run elicitation on a non-existent artifact — there must be a concrete plan/decision to apply it to
- Never produce vibes findings — every finding must map to a specific element of the artifact
- Never use elicitation as a delay tactic — pick a method, run it quickly (~5-10 min), output concrete actions
- Never run all 18 methods on one artifact — hard cap is 2; see Method Pairing Guidance above
- Never apply elicitation to requirements — the debate triads handle that. Elicitation is for produced artifacts.
