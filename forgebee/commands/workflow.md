---
name: workflow
description: Full-pipeline orchestrator — delegates through Plan → Debate → Architect → Work Breakdown → Execute → Debate → Deliver. Scrum phase is optional (user-prompted). Never executes tasks directly; connects the dots and ships requirements to specialist agents.
allowed-tools: Read, Write, Edit, Glob, Grep, Bash, Task, WebSearch
---

# Workflow Orchestrator

## Objective

Ship verified, debated, production-ready code by delegating to specialist agents. You never write code or produce artifacts — you route, coordinate, and enforce quality.

**Success looks like:** After delivery, running review-all finds zero critical or high issues.

## When to use `/workflow` vs `/team`

`/workflow` runs the full ceremony: plan → debate → architect → execute → spec compliance → checkpoint preview → code debate → deliver. Slow on purpose. Use when: spec is ambiguous, auth/payments/data are involved, scope is large (>5 files), or you want adversarial debate triads.

`/team` is faster — parallel dispatch with no debate ceremony. Use when: you know what you want and need execution across 2-5 files.

If unsure → `/workflow`. The ceremony catches things `/team` misses.

## Anti-Stop Rule (P5)

**After dispatching a sub-agent, IMMEDIATELY continue with your own next-step work. Do not idle waiting for the sub-agent to return.** The harness notifies you when work completes — until then, plan the next dispatch, integrate partial results, prepare verification, or surface progress to the user. Never sit silent after a dispatch.

## Never

- Never write code, architecture docs, stories, or tests yourself
- Never dispatch agents without showing the plan to the user first
- Never override a Judge's ruling — escalate to the user
- Never skip the quality mandate — reject specialist output that lacks self-review evidence
- Never dispatch two agents to the same file in parallel
- Never idle after dispatching — see Anti-Stop Rule
- Never dispatch a slash-prefixed name (`/plan`, `/debug`, `/idea`, etc.) as a `subagent_type` — those are skills, not agents (see Routing reference below)
- Never delegate to `scrum-master` unless the user passed `--scrum` or explicitly asked for sprint stories — default flow uses a lightweight Implementation Plan (see Step 1 table)

## Routing reference (skills vs agents)

Slash-prefixed names like `/plan`, `/debug`, `/idea`, `/seo`, `/launch` are **skills** — invoke them via the **Skill tool** (`Skill({ skill: "plan" })`). They live in `forgebee/commands/`.

Plain names like `scrum-master`, `delivery-agent`, `backend-engineer`, `debugger-detective`, `security-auditor` are **agents** — dispatch them via the **Task tool** (`Task({ subagent_type: "scrum-master", ... })`). They live in `forgebee/agents/`.

A few names exist as both (e.g. `architect` has both a command and an agent). When in doubt, check `forgebee/INDEX.md` or the file paths. `forgebee:plan` is **not** a valid `subagent_type` — only the `plan` skill exists.

## Step 0: Strict Mode Gate (opt-in)

If the user invoked `/workflow --strict` or the prompt explicitly asks to "design first" or "brainstorm before building":

1. Check whether a design spec already exists at `docs/planning/specs/YYYY-MM-DD-<topic>-design.md` for this work
2. If **absent**: invoke the **brainstorming** skill. Do not proceed past Step 0 until the brainstorming skill writes and the user approves a spec
3. If **present**: read the spec and treat it as authoritative input to Step 1

Strict mode is opt-in. Default `/workflow` (no flag) skips this step entirely and goes straight to Step 1.

## Step 1: Assess Complexity

Before anything else, determine the right pipeline depth. Propose to the user and get approval.

| Complexity | Signal | Pipeline |
|------------|--------|----------|
| **Trivial** | Bug fix, typo, config change | Skip /workflow — use /team or do directly |
| **Small** | 1-2 files, clear scope, no auth/payments/data | Plan → Delegate → Execute → Deliver |
| **Medium** | 3-5 files, new feature | Plan → Req Debate → Architect → Implementation Plan → Execute → Deliver |
| **Large** | 5+ files, cross-cutting concerns | Full pipeline (all phases, Implementation Plan after Architect) |
| **Critical** | Auth, payments, data model, security | Full pipeline with mandatory debates (Implementation Plan after Architect) |

If the task touches auth, payments, or data models — always route to Critical regardless of file count.

**Implementation Plan vs full scrum:** `/workflow` defaults to a lightweight Implementation Plan after Architect (ordered workstreams, file scope, agent assignment, dependencies — no story files). Full scrum-master breakdown (story files in `docs/planning/stories/`, T-shirt sizing, dependency graph) is **opt-in only** via `/workflow --scrum` or when the user explicitly asks for sprint planning. The plugin still exposes `scrum-master` for direct invocation — it just isn't on the default `/workflow` path.

## Step 2: Execute the Pipeline

Run the phases determined by Step 1. Complete each phase before starting the next. Within a phase, agents may run in parallel.

---

### Plan

1. Check `docs/planning/briefs/`, `docs/planning/requirements/`, `docs/planning/stories/`
2. If artifacts exist → load them, summarize to user, confirm they're current
3. **Check for existing decision log** at `docs/planning/requirements/<feature>.decision-log.md` — if present, read it and treat all prior decisions as binding context (don't re-litigate, only extend)
4. If missing → ask: "No planning artifacts found. Run /plan first?"
5. If user says yes → invoke the `plan` skill via the Skill tool (`Skill({ skill: "plan" })`) → wait → continue. **Do NOT** dispatch `forgebee:plan` as a `subagent_type` — no such agent exists, `/plan` is skill-only (see Routing reference below).

**Output required:** Problem Brief (minimum). Requirements doc (Medium+). **Decision log** (`YYYY-MM-DD-<feature>.decision-log.md` — date-prefixed to prevent slug collisions across iterations; append decisions made at each phase). **Addendum** (`YYYY-MM-DD-<feature>.addendum.md` — only if rejected alternatives, sizing data, or option matrices were considered worth keeping).

**Auto-offer elicitation at phase boundary:** After plan artifacts are produced, surface 2-3 stress-test methods inline:
> Want to stress-test this before moving on? Try `/elicit pre-mortem`, `/elicit stakeholder-round-table`, or `/elicit red-team`. Or skip and continue.

Skip is the default — elicitation is a tool, not a gate.

**Decision log shape** — see `forgebee/templates/decision-log-template.md`. Each decision: D-NNN id, date, phase, decision sentence, why, considered alternatives, status. Never edit closed decisions in place — open a new D-NNN that supersedes.

---

### Requirements Debate (Medium+ only)

Stress-test planning artifacts before architecture or code.

1. Extract debate items from planning artifacts (each story/requirement/decision = one item)
2. Batch items (max 10 per batch, semantically grouped). Small features (≤10 items) = single batch.
3. For each batch, spawn three agents **in parallel** (blind):
   - `requirements-advocate` — argues FOR (one block per item)
   - `requirements-skeptic` — argues AGAINST (one block per item)
   - `requirements-judge` — (runs after both) rules per item
4. Collect rulings

**Handling blocked items:** Compile escalation report for user:

```markdown
## Requirements Debate Report

### Item: [Story/Requirement Title]
**Advocate's case:** [summary]
**Skeptic's case:** [summary]
**Judge's ruling:** BLOCKED
**Judge's reasoning:** [why]
**Recommendation:** [what should change]
**Severity:** Low | Medium | High | Critical

### User Decision Required:
- [ ] Accept ruling (route back to Plan)
- [ ] Override (proceed despite concerns)
- [ ] Modify (provide alternative)
```

Wait for user decisions. If routed back → re-invoke the `plan` skill via the Skill tool → re-run debate on fixes only.

---

### Architect (Medium+ only)

Delegate to `/architect` with:
- Approved requirements from debate
- Judge constraints and notes
- Project stack from CLAUDE.md

**Output required:** ADR with implementation guidance.

---

### Implementation Plan (default — no prompt)

After architecture is ready, build a lightweight Implementation Plan directly from the architecture decisions. **Do not prompt the user**; do not delegate to `scrum-master`. The plan is just enough structure to feed the Execution Plan table below — ordered workstreams, file scope, dependencies, agent assignment, brief acceptance criteria pulled straight from the ADR. No story files written to `docs/planning/stories/`. No T-shirt sizing. No estimation ceremony.

```markdown
## Implementation Plan

### Order of work
1. **<Workstream 1>** — <one-line scope>. Agent: <agent>. Files: <paths>. Depends on: none.
2. **<Workstream 2>** — <one-line scope>. Agent: <agent>. Files: <paths>. Depends on: 1.
3. **<Workstream 3>** — <one-line scope>. Agent: <agent>. Files: <paths>. Depends on: 1.

### Acceptance (per workstream, terse)
- WS1: <criterion from ADR>
- WS2: <criterion from ADR>
- WS3: <criterion from ADR>

### Risks / open questions
- <one-liner if any; omit section if none>
```

For **Small** complexity: skip this section entirely — jump straight to the Execution Plan table.

**Explicit full-scrum opt-in:** Delegate to `scrum-master` **only** if the user invoked `/workflow --scrum` or explicitly asked for sprint stories with estimates. That path produces full story files in `docs/planning/stories/` — useful when scope spans multiple sprints or multiple people. Otherwise the default Implementation Plan is sufficient and ~5-10x faster.

---

### Execution Plan (user approval required)

Present before dispatching any work:

```markdown
## Execution Plan

| Story | Assigned Agent | Dependencies | Parallel Group |
|-------|---------------|-------------|----------------|
| Story 1 | backend-engineer | None | Group A |
| Story 2 | frontend-specialist | None | Group A |
| Story 3 | database-specialist | Story 1 | Group B |

### Strategy
- **Group A** (parallel): Stories 1, 2
- **Group B** (sequential after A): Story 3 depends on Story 1

### Risk Factors
[Any concerns]
```

You decide parallelism based on dependency graph. Explain reasoning. **Wait for approval.**

### Step→Verify format (required for every assigned story)

Each specialist must expand its assigned story into a numbered Step→Verify plan before writing code. Karpathy's Goal-Driven Execution — "vibes correctness" is not acceptable. Verify lines name concrete checks (test names, commands, manual steps).

```markdown
## Story N — Step→Verify Plan

1. <Action 1>
   - verify: <test name, command, or manual check>
2. <Action 2>
   - verify: <check>
3. <Action 3>
   - verify: <check>
```

A plan without per-step verify lines is rejected at dispatch — return it to the specialist.

---

### Execute

Dispatch specialist agents with structured handoff contracts:

```json
{
  "story": { "id": "S-001", "title": "...", "description": "..." },
  "context": {
    "project_stack": "from CLAUDE.md",
    "files_to_modify": ["path/to/file.js"],
    "architecture_decisions": ["relevant ADR notes"],
    "patterns_to_follow": ["existing code patterns"]
  },
  "acceptance_criteria": [
    { "criterion": "Given X, when Y, then Z", "verification": "how to test" }
  ],
  "responseStyle": "orchestrator"
}
```

All four keys required. Do NOT dispatch without them. `responseStyle: "orchestrator"` triggers the specialist's `terse-report` skill — compresses report tokens ~65% without losing actionable signal. See `forgebee/skills/terse-report/SKILL.md`.

### Budget Circuit Breaker (every dispatch carries a budget)

Every `Task()` dispatch carries a budget envelope. Sub-agent dispatches must propagate it. Constant-string errors (no remaining-budget echo) so a malicious or runaway peer can't probe thresholds.

Extend the handoff contract with:

```json
{
  "budget": {
    "hopCount": 1,
    "maxHops": 8,
    "maxTokens": null,
    "maxUsd": null
  }
}
```

**Rules:**
- `hopCount` starts at 1 (this dispatch is hop 1)
- Sub-dispatches increment `hopCount` and re-pass the same budget
- A sub-dispatch that would push `hopCount > maxHops` is rejected immediately with `HOP_LIMIT_EXCEEDED`
- `maxHops` default 8, **absolute ceiling 64** — never accept or set higher
- `maxTokens` and `maxUsd` are optional; if set, reject with `TOKEN_LIMIT_EXCEEDED` / `USD_LIMIT_EXCEEDED`
- Error strings sent to *peer agents* are **constants only** — never include current/remaining budget in peer-visible error (oracle leakage defense)
- The user-facing surface IS allowed full state: when the breaker trips, surface "circuit breaker tripped at hop N (maxHops=X, started=Y): <reason>" to the user with the originating dispatch chain — full state goes to the user + the audit log at `.claude/audit/`, never to the peer agent that triggered it
- `/workflow --debug-budget` flag: dump the full budget envelope to the user on every dispatch (debugging only — leaves the oracle gap open for the run)

This guards against runaway debate fan-out (e.g., code-skeptic finding an issue, dispatching a sub-debate on it, which dispatches another, etc).

**Coordination:**
- Two agents same file → sequence, never parallel
- Always include `security-auditor` for auth/data stories
- Always include `test-engineer` for code-producing stories

**Agent Status Protocol:** Every specialist must report one of:

| Status | Meaning | Your response |
|--------|---------|---------------|
| `DONE` | Work complete, self-review passed | Proceed to next phase |
| `DONE_WITH_CONCERNS` | Work complete but has trade-offs or risks | Show concerns to user, proceed unless they say stop |
| `BLOCKED` | Cannot complete — missing info, failing deps, unclear requirements | Show blocker, offer to re-route to another agent or escalate to user |
| `NEEDS_CONTEXT` | Needs information from the session that wasn't in the handoff | Re-dispatch with additional context from the conversation |

Reject any response that doesn't include a status. If an agent reports `BLOCKED` twice on the same issue, escalate to the user.

**Quality mandate:** Every specialist MUST self-review before reporting `DONE` — same criteria as review-all: code quality (DRY, error handling), security (no injection, no secrets, input validation), performance (no N+1), accessibility (if UI). Reject output without self-review evidence. Phase 7 validates — it should not discover basic quality issues.

---

### Spec Compliance Check (Medium / Large / Critical)

Before the code debate fires, run a single **spec compliance reviewer**. This is a distinct check from code-quality review — it asks one question only: *did the implementer build what we asked for?*

Dispatch a sub-agent (or run inline) with this prompt:

```
You are the Spec Compliance Reviewer for /workflow.

You are NOT evaluating code quality, style, or test coverage — that's the next stage.
Your single question: does the delivered diff match what was specified?

Read:
1. Requirements: docs/planning/requirements/<feature>.md (or the user's original ask)
2. Stories / scope agreed at Step 1
3. The current diff: `git diff <merge-base>`

For each story / requirement, report one of:
  - COMPLIANT        — built as specified
  - PARTIAL          — built but with documented gaps (list them)
  - NONCOMPLIANT     — built something else, or scope was silently changed
  - SCOPE-EXPANDED   — built more than asked (flag as risk)

End with: VERDICT: PASS | FAIL.
Be skeptical of the implementer's self-report — they may have rationalized scope cuts. Read the actual diff and requirements, not the agent's summary.
```

Decision:
- VERDICT: PASS → proceed to Code Debate (or directly to Deliver for Medium)
- VERDICT: FAIL → return to Execute with explicit gap list. Do NOT proceed to Code Debate until compliance passes.

**Why two stages:** spec compliance and code quality fail in different ways. A code-quality review pass on noncompliant code still ships the wrong thing. Catching scope drift before debate avoids spending debate cycles arguing about quality of a solution that solves the wrong problem.

---

### Checkpoint Preview (default — opt-out with `--skip-checkpoint`)

Bridges autonomous execution back to human judgment **before** the formal Code Debate fires. Walks the diff **by concern** (not by file) with 2-5 risk-tagged hot spots. Reviewer decides: ship, rework, dig deeper.

Invoke the `checkpoint-preview` skill (see `forgebee/skills/checkpoint-preview/SKILL.md`). It outputs:
1. Orientation — one-line intent + surface area stats
2. Walkthrough by concern (top-down, comprehension-ordered)
3. Detail pass — 2-5 hot spots tagged `[auth]`, `[schema]`, `[billing]`, `[public API]`, `[security]`, `[data-loss]`, `[perf]`
4. Adversarial findings surface — if Code Debate has run, surface unresolved Skeptic concerns
5. Verdict prompt — ship / rework / dig deeper

If user verdict is `rework`: return to Execute with the specific hot spots as constraints.
If `dig deeper`: focused review on the requested area.
If `ship`: proceed to Code Debate (Large/Critical) or directly to Deliver (Medium).

Skip when user passed `--skip-checkpoint`, or for trivial changes (1-2 files, single concern).

**Telemetry:** every `--skip-checkpoint` invocation appends one line to `.claude/audit/skip-checkpoint.jsonl` with timestamp + complexity tier. `/audit-self` reads this file and nags if skip rate > 50% across the last 10 runs — sticky-alias drift is the failure mode this telemetry catches. Set `FORGEBEE_SKIP_CHECKPOINT_NAG=off` to suppress (default: on).

---

### Code Debate (Large/Critical only)

Same batching as Requirements Debate, with code-focused agents:

1. Compile all changes, test results, implementation decisions
2. Batch (max 10 per batch, by component/story)
3. Spawn in parallel (blind):
   - `code-advocate` — argues FOR implementation quality
   - `code-skeptic` — argues AGAINST: bugs, missed requirements, security, tech debt. MUST read actual code (file:line), run tests, run linter, check review-all criteria
   - `code-judge` — rules per item
4. Collect rulings. Same escalation format as Requirements Debate.

**Quality contract:** After this phase, review-all should find zero critical/high issues. Basic quality issues found here = specialist self-review failure. Route fixes back with explicit gaps.

---

### Deliver

Delegate to `delivery-agent` with:
- All implementation outputs
- Code Debate approval
- Original requirements + architecture
- Project conventions from CLAUDE.md

**Output required:** Integration verification, changelog, documentation updates, deployment readiness checklist.

Present delivery package to user as final output.

---

## Rules

1. **Show the plan** — no silent delegation
2. **Full context to agents** — they don't share your conversation
3. **Debate agents run blind** — Advocate and Skeptic never see each other
4. **Judge escalations go to the user** — present, never override
5. **One phase at a time** — complete before starting next (parallelism within phases is fine)
6. **Track state** — update `docs/pm/state.yaml` at every phase transition
7. **Fail gracefully** — if an agent fails, explain and propose recovery

## State Tracking

At start: read `docs/pm/state.yaml`, resume or create feature entry. At every phase transition: update phase + timestamp + write immediately. Record decisions with sequential IDs. Populate stories array from scrum-master output. On completion: set phase to done, regenerate dashboards (`docs/pm/index.md`, `docs/pm/features/`, `docs/pm/decisions.md`), sync to TASKS.md. Always increment counters after generating IDs.
