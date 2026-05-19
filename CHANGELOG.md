# Changelog

All notable changes to ForgeBee are documented here.

The format roughly follows [Keep a Changelog](https://keepachangelog.com/) and the project uses [Semantic Versioning](https://semver.org/).

---

## [5.1.0] — 2026-05-19

**Theme: System discipline.** Major behavioral upgrade across every code-producing agent — Karpathy principles baked into every decision point, adversarial input hardening on all 48 agents, three new skills for forensic diagnosis and stress-testing, token-saving terse-report mode for sub-agents, and an auto-generated routing index that cuts session token cost.

Distilled from external research (BMAD-METHOD, Caveman, ECC, Karpathy guidelines, Ruflo, Superpowers) and a full systematic audit of the existing 25 skills, 48 agents, and 33 commands.

### Added — New skills

- **`brainstorming`** — opt-in hard-gate triggered by `/workflow --strict`. Blocks implementation until a written, approved design spec exists at `docs/planning/specs/`.
- **`elicitation`** + `methods.csv` — 18 named reasoning methods (Pre-mortem, Red Team, Inversion, Stakeholder Round Table, Tree of Thoughts, …) applied to artifacts, not requirements.
- **`surface-ambiguity`** — fires when an agent is about to make a non-trivial silent pick. Forces listing of interpretations + rationale.
- **`terse-report`** — sub-agent compression mode triggered by `responseStyle: "orchestrator"` in handoff contracts. ~65% token reduction.
- **`checkpoint-preview`** — diff-by-concern walkthrough with `[auth]`/`[schema]`/`[billing]`/`[security]`/`[data-loss]` risk tags. Runs after Spec Compliance, before Code Debate.
- **`investigate`** — forensic diagnosis with Confirmed / Deduced / Hypothesized grading. Never erases hypotheses. Hands off to `debugger-detective` for the fix.
- **`audit-self`** — re-runs the full quality scorecard across all skills/agents/commands. Detects regressions since the last audit. Timestamped findings.

### Added — New commands

- **`/investigate`** — forensic case file (diagnosis only; fix is a separate handoff)
- **`/elicit [method-name]`** — stress-test the most recent plan/design with a named method
- **`/audit-self`** — on-demand quality regression check

### Added — Karpathy Core Principles (P1–P6 in CLAUDE.md)

Applied to every code-producing decision via `CLAUDE.md` and per-agent injection (22 code-producing agents got the block):

- **P1 Trace Test** — every changed line traces to the user's request
- **P2 Senior Engineer Test** — would a senior engineer call this overcomplicated?
- **P3 YAGNI Timing** — solve today's problem simply, not tomorrow's prematurely
- **P4 Orphan Rule** — clean only what your changes made unused
- **P5 Anti-Stop Rule** — orchestrators continue work immediately after dispatch (in `/workflow` + `/team`)
- **P6 Severity Standard** — Critical / High / Medium / Low across all review skills

### Added — Safety hardening

- **Adversarial Input Hardening preamble** on all 48 agents — homoglyphs, urgency markers, role-play overrides, embedded instructions flagged not executed
- **Budget circuit breaker** on every `Task()` dispatch in `/workflow` + `/team` (`maxHops` default 8, ceiling 64) with constant-string errors (no oracle leakage)
- **`safeWriteFlag()`** hook helper — `O_NOFOLLOW` symlink-clobber defense for predictable user-owned paths
- **`validateHookFields()`** hook helper — defends against Claude Code's Zod silently dropping `settings.json` on schema mismatch
- **Sensitive-path refusal** in `compress-learnings.js` — never compresses files mentioning `.env`, credentials, `.ssh/`, `.aws/`, private keys, secrets

### Added — Templates

- `templates/decision-log-template.md` — D-NNN decisions across phases, with status (Confirmed/Tentative/Reversed-by)
- `templates/addendum-template.md` — rejected alternatives, options matrices, sizing data
- `templates/failure-capture-template.md` — 7-field block required in `debugger-detective` before any recovery action
- `templates/investigation-case-file.md` — Confirmed/Deduced/Hypothesized case file shape
- `templates/prompt-defense-baseline.md` — canonical Adversarial Input Hardening text

### Added — Workflow discipline

- **Step→Verify plan format** required across `/workflow`, `/team`, `/debug`, `/plan` — every numbered step names its concrete verification
- **Spec Compliance Check** phase in `/workflow` — runs between Execute and Code Debate, asks "did we build what was asked?"
- **Decision logs + addenda** — `/workflow` and `/plan` emit `.decision-log.md` + `.addendum.md` alongside outputs; re-read on subsequent runs

### Added — Infrastructure

- **`forgebee/INDEX.md`** + **`scripts/build-index.js`** — auto-generated routing index loaded on SessionStart. Replaces ~115 frontmatter scans with 1 file read per session.
- **`forgebee/hooks/scripts/load-index.js`** — SessionStart hook emits INDEX.md as `additionalContext`
- **`.github/workflows/index-check.yml`** — CI fails PR if INDEX.md drifts from frontmatter
- **`.github/workflows/sync-manifests.yml`** — auto-fixes manifest version drift on push
- **`forgebee/skills/continuous-learning/scripts/compress-learnings.js`** — ages out >14-day session entries; archives to `learnings-archive-YYYY-Q<N>.md`

### Changed — Existing skills/agents

- **`continuous-learning`** — restructured from 185 → 75 lines; system docs moved to `references/architecture.md` + `references/scope-and-confidence.md`
- **`project-router` description** — trimmed from 422 → 199 chars; leads with "Use when..." trigger
- **`code-skeptic`** — quality gate now references `review-all` as single source of truth (no inline duplication / drift)
- **`tdd-enforcer`** — explicit boundary with `test-engineer` (tdd-enforcer audits cycle; test-engineer writes tests)
- **5 review skills** — severity vocabularies normalized to `Critical / High / Medium / Low` (was `CRITICAL / WARNING / SUGGESTION` in 5 files)
- **`strategy-judge`** — escalation logic now parallel to `code-judge` and `requirements-judge` (severity-based with strategy-specific additions)

### Changed — Agent bloat trim (W16)

6 agents moved framework/template content to `forgebee/agents/references/`:

- `supabase-specialist`: 608 → 158 lines
- `email-strategist`: 393 → 126 lines
- `nextjs-seo`: 380 → 100 lines
- `conversion-optimizer`: 368 → 139 lines
- `saas-cro`: 365 → 98 lines
- `nextjs-content`: 337 → 97 lines

Total: 2,451 → 718 lines in persona files (1,733 lines moved to references).

### Changed — Status protocol

Every one of the 48 agents now reports the canonical `DONE | DONE_WITH_CONCERNS | BLOCKED | NEEDS_CONTEXT` status. Three agents with domain-specific verdicts (`verification-enforcer`, `delivery-agent`, `tdd-enforcer`) ship a Verdict → Canonical Status mapping table that surfaces both.

### Changed — Command-vs-Agent delegation

5 commands now delegate cleanly to their corresponding agents instead of re-implementing inline:

- `/analytics` → `performance-analyst`
- `/seo` → `seo-specialist`
- `/perf` → `performance-optimizer`
- `/competitive` → `market-intel`
- `/learn` → adds compression step + delegates to `continuous-learning` skill

`/pm` intentionally retained as direct-execution (audit decision — methodology is the work).

### Changed — Email sequence ownership

`email-strategist` is the single source of truth. `content-creator` and `content-writer` no longer hold email-sequence templates — they reference and delegate.

### Fixed — Audit findings (Bucket Z)

- **9 agents** missing `## Escalation` sections — added with per-agent tailored triggers (architect, deep-researcher, flutter-expert, ios-expert, n8n-builder, performance-optimizer, scrum-master, session-librarian, ux-designer)
- **`ux-designer` description** — clarified: produces UX specs, does NOT write code; hand off to `frontend-specialist`
- **`performance-optimizer`** — expanded from 77 → 112 lines with Self-Review (8 checks) + Failure Modes (6 patterns)
- **`n8n-builder`** — removed duplicate Never rules
- **`forgebee-setup` description** — trimmed from 341 → 186 chars

### Multi-platform

Plugin descriptions updated across all 4 manifests (`marketplace.json`, `forgebee/.claude-plugin/plugin.json`, `.codex-plugin/plugin.json`, `.cursor-plugin/plugin.json`) to reflect 5.1.0 capabilities.

### Stats delta (5.0.0 → 5.1.0)

| Metric | 5.0.0 | 5.1.0 |
|---|---|---|
| Skills | 25 | 31 |
| Agents | 48 | 48 |
| Commands | 33 | 36 |
| Hooks | 22 | 23 |
| Templates | 0 | 5 |
| Avg agent length | growing | bounded by `/audit-self` |

---

## [5.0.0] — Earlier 2026

**Theme: Distribution + safety nets.**

### Added
- Multi-platform manifests (`.codex-plugin/`, `.cursor-plugin/`, `gemini-extension.json`, `AGENTS.md` symlink)
- `.version-bump.json` + `scripts/bump-version.sh` — single source of truth for version across 6 files; drift detection; full-repo audit
- Auto-learn nudge on SessionStart when ≥5 pending instincts and `/learn` not run in 24h
- Two-stage review in `/workflow` (Spec Compliance before Code Debate)
- 3-failed-fix Iron Law in `debugger-detective` — escalate to architecture after 3 attempts
- Brainstorming skill scaffolding (opt-in via `/workflow --strict`)
- "Use when..." description audit across review-* skill family

### Changed
- All review-* skill descriptions rewritten from "X Review Agent — reviews..." to "Use when..." triggering format

---

## [Older versions]

See git history. v5.0.0 onward maintained in this CHANGELOG.
