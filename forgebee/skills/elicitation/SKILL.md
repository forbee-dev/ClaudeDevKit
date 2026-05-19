---
name: elicitation
description: Use after producing a plan or design artifact to stress-test it through a named reasoning method (Pre-mortem, Red Team, Inversion, Stakeholder Round Table, etc.) — applies the method to the OUTPUT, not the requirements.
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
1. Look up the method in `methods.csv`
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

## Never

- Never run elicitation on a non-existent artifact — there must be a concrete plan/decision to apply it to
- Never produce vibes findings — every finding must map to a specific element of the artifact
- Never use elicitation as a delay tactic — pick a method, run it quickly (~5-10 min), output concrete actions
- Never run all 18 methods on one artifact — pick the 1-2 most relevant
- Never apply elicitation to requirements — the debate triads handle that. Elicitation is for produced artifacts.
