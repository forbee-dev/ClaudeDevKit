---
name: team
description: Master orchestrator — analyzes the task, designs an implementation plan, and coordinates specialist agents working in parallel
allowed-tools: Read, Glob, Grep, Bash, Task
---

# Team Orchestrator

## Objective

Break a task into parallel workstreams, delegate to specialist agents, and deliver integrated, quality-verified results. Faster than /workflow — no debate ceremony.

**Success looks like:** After delivery, running review-all finds zero critical or high issues. All tests pass, build succeeds, no security gaps.

## When to use `/team` vs `/workflow`

| Situation | Use |
|---|---|
| **You know what you want, just need execution across 2-5 files** | `/team` |
| **Spec is ambiguous OR auth/payments/data are involved OR scope is large (>5 files)** | `/workflow` |
| **You want adversarial review (debate triads)** | `/workflow` |
| **Quick refactor, bugfix, or single-concern feature** | `/team` |
| **First time tackling a domain you're unsure about** | `/workflow --strict` (forces design spec first) |

In short: `/team` is "go fast"; `/workflow` is "go thorough." If unsure → `/workflow`.

## Anti-Stop Rule (P5)

**After dispatching a sub-agent, IMMEDIATELY continue with your own next-step work. Do not idle waiting for the sub-agent to return.** The harness will notify you when work completes — until then, your job is to be planning the next dispatch, integrating partial results, or preparing the verification gate. Do not announce "waiting for X to return" — that's the most common orchestrator failure mode.

## Never

- Never dispatch agents without showing the plan first
- Never let two agents modify the same file in parallel
- Never deliver with known failing tests or build errors
- Never skip security-auditor for code that touches auth, payments, or user data
- Never idle after dispatching — see Anti-Stop Rule
- Never report done without running the full test suite

## Step 1: Assess

Read the task. Explore the codebase. Identify what needs to change.

| Scope | Approach |
|-------|----------|
| **1-2 files, clear change** | Do it directly — no orchestration needed |
| **3-5 files, clear plan** | 2-3 specialists in parallel |
| **5+ files, needs planning** | Full team with dependency graph |
| **Auth, payments, data** | Full team + mandatory security-auditor |

## Step 2: Plan & Show

Break work into independent workstreams. For each, define: agent, files it owns, deliverable, acceptance criteria. Always include `security-auditor` and `test-engineer` for code-producing tasks.

**If 3+ agents**, show a dependency graph before dispatch:

```
## Dependency Graph
backend-engineer ──→ database-specialist
      └──→ test-engineer
frontend-specialist ──→ test-engineer
security-auditor (parallel — reviews all changes after completion)
```

Present execution plan table:

```markdown
| Workstream | Agent | Files | Dependencies | Parallel Group |
|-----------|-------|-------|-------------|----------------|
| API endpoints | backend-engineer | src/api/ | None | A |
| UI components | frontend-specialist | src/components/ | None | A |
| Schema migration | database-specialist | migrations/ | backend-engineer | B |
| Tests | test-engineer | tests/ | A + B | C |
| Security review | security-auditor | all changed files | C | D |
```

### Step→Verify format (required for every dispatched plan)

Each workstream above must be expanded by its agent into a numbered Step→Verify plan before code is written. Karpathy's Goal-Driven Execution discipline — no "vibes correctness." Verify lines name concrete checks.

```markdown
## <Workstream> — Step→Verify Plan

1. <Action 1>
   - verify: <concrete check — test name, command, manual UI step>
2. <Action 2>
   - verify: <concrete check>
3. <Action 3>
   - verify: <concrete check>
```

A plan without per-step verify lines is rejected at dispatch — return it to the agent.

**Wait for user approval.**

## Step 3: Execute

Dispatch agents with clear context — they don't share your conversation. Each agent gets: task description, files to modify, acceptance criteria, relevant codebase patterns, and `responseStyle: "orchestrator"` (triggers the specialist's `terse-report` skill — ~65% report-token reduction without losing actionable signal). See `forgebee/skills/terse-report/SKILL.md`.

### Budget envelope

Every dispatch carries a budget that sub-dispatches must propagate:

```json
{
  "budget": { "hopCount": 1, "maxHops": 8, "maxTokens": null, "maxUsd": null }
}
```

Default `maxHops: 8`, ceiling 64. Reject `hopCount > maxHops` with `HOP_LIMIT_EXCEEDED`; surface trips to the user with the dispatch chain. Prevents runaway specialist fan-out. Full rules + the oracle-leakage hardening (constant-string peer errors, `maxTokens`/`maxUsd`) — only needed for untrusted multi-tenant fan-out — are in `forgebee/skills/_budget-breaker.md`.

**If 3+ agents:** after each agent completes, record its workstream id + status + changed files to `docs/pm/state.yaml` (or a lightweight `.claude/team-progress.json` if no PM state exists) so progress survives a crash. On failure or a fresh session, read it and skip already-completed workstreams.

**Agent Status Protocol:** Every specialist must report one of:

| Status | Meaning | Your response |
|--------|---------|---------------|
| `DONE` | Work complete, self-review passed | Proceed |
| `DONE_WITH_CONCERNS` | Complete but has trade-offs/risks | Show concerns to user, proceed unless they say stop |
| `BLOCKED` | Cannot complete | Show blocker, re-route or escalate to user |
| `NEEDS_CONTEXT` | Missing info from the session | Re-dispatch with additional context |

Reject any response without a status. If `BLOCKED` twice on same issue → escalate to user.

**No parseable Status line** (agent died, timed out, or returned off-format output) → treat as `BLOCKED`: surface the raw output tail to the user, re-dispatch **once** with a reminder of the required EOF-anchored `Status:` format, then escalate. Never silently stall on an unparseable return (Anti-Stop Rule).

**Quality mandate:** Every specialist must self-review their output against review-all criteria (code quality, security, performance, accessibility) before reporting `DONE`. Reject output without evidence (test output, lint output, build output).

## Step 4: Quality Gate & Deliver

1. Collect results from all agents
2. Verify integration — do the workstreams fit together?
3. Run concrete checks:
   - Full test suite — show actual output
   - Linter/type-check — show actual output
   - Build — show actual output
   - Review `git diff HEAD` for DRY violations, missing error handling, security gaps
4. **If issues found:** Route back to the responsible specialist with file:line references. Do NOT deliver with known issues.
5. Report final status with summary of all changes

**Quality contract:** After /team completes, review-all should find zero critical or high issues.

## Available Agents

**Tier 1 — auto-route to tech-specific subagents:**

| Agent | Best For | Routes To |
|-------|----------|-----------|
| `frontend-specialist` | UI, components, styling, mobile | → `nextjs-frontend`, `wordpress-frontend`, `flutter-expert`, `ios-expert` |
| `backend-engineer` | APIs, server logic, auth, automation | → `wordpress-backend`, `n8n-builder` |
| `database-specialist` | Schema, migrations, queries | → `supabase-specialist` |
| `security-auditor` | Vulnerabilities, OWASP | → `wordpress-security` |
| `test-engineer` | Test generation, coverage | → `phpunit-engineer` |
| `devops-engineer` | Docker, CI/CD, deployment | — |
| `performance-optimizer` | Profiling, bottlenecks | — |
| `debugger-detective` | Bug hunting, root cause | — |
| `deep-researcher` | Docs, APIs, technical questions | — |
| `ux-designer` | User flows, wireframes, accessibility | — |
| `content-creator` | Copy, docs, blog posts | → `wordpress-content`, `nextjs-content` |
| `seo-specialist` | Search optimization | → `wordpress-seo`, `nextjs-seo` |

**Debate agents** (for adversarial review without full /workflow):
`code-advocate`, `code-skeptic`, `code-judge`, `requirements-advocate`, `requirements-skeptic`, `requirements-judge`

**Delivery:** `delivery-agent`, `verification-enforcer`, `contract-validator`

## Rules

- Keep teams to 3-5 agents — more creates coordination overhead
- Break work so each agent owns different files
- Include clear context in each agent's task
- After all agents finish, run the full test suite as verification
