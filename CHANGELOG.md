# Changelog

All notable changes to ForgeBee are documented here.

The format roughly follows [Keep a Changelog](https://keepachangelog.com/) and the project uses [Semantic Versioning](https://semver.org/).

---

## [5.1.3] — 2026-05-20

**Theme: lighter `/workflow` breakdown for ticket-driven work.** Patch release removing the `scrum-master` prompt from the default `/workflow` path. Solo devs (and anyone arriving with a ticket that already has brief + architecture in hand) no longer pay the sprint-ceremony tax — the default is now an ordered Implementation Plan produced directly by the orchestrator.

### Changed — `/workflow` Work Breakdown now defaults to Implementation Plan

- **Default flow no longer prompts the user** to choose between full sprint planning and direct delegation. After Architect, `/workflow` produces a lightweight Implementation Plan directly: ordered workstreams, file scope, agent assignment, dependencies, brief acceptance criteria pulled from the ADR. No story files written to `docs/planning/stories/`. No T-shirt sizing. No estimation ceremony. ~5-10x faster than dispatching `scrum-master` for a typical Medium-complexity ticket.
- **`scrum-master` opt-in via `/workflow --scrum`** for the cases that genuinely warrant full sprint stories (multi-sprint scope, multi-person execution, backlog grooming). The `scrum-master` agent itself is unchanged and still available for direct invocation outside `/workflow`.
- **Step 1 complexity table updated.** Medium/Large/Critical pipelines now say "Implementation Plan after Architect" instead of "Prompt before scrum". Added clarifying note distinguishing default Implementation Plan from opt-in scrum.
- **New "Never" rule:** "Never delegate to `scrum-master` unless the user passed `--scrum` or explicitly asked for sprint stories." Enforces the default.

### Docs

- **README.md** `/workflow` row and Quality Pipeline bullet updated to reflect the new default. Pattern stays consistent with the existing `--skip-checkpoint` and `--strict` opt-in flags.

---

## [5.1.2] — 2026-05-20

**Theme: orchestrator routing + discovery-search hardening.** Patch release fixing two friction points that surfaced during real `/workflow` runs: ambiguous "delegate to /plan" wording that led orchestrators to dispatch a non-existent `forgebee:plan` agent, and unbounded `grep -r` calls during the Plan phase stalling for 10+ minutes on WordPress theme / vendored subtrees.

### Fixed — Workflow routing

- **`/plan` dispatch ambiguity.** `forgebee/commands/workflow.md` said "delegate to `/plan`" in two places. `/plan` is skill-only — no `plan` agent twin exists — so dispatching `forgebee:plan` as a `subagent_type` failed with `Agent type 'forgebee:plan' not found`. Now reads "invoke the `plan` skill via the Skill tool (`Skill({ skill: "plan" })`)" with an explicit "do NOT dispatch `forgebee:plan`" warning. Re-delegation path in the Requirements Debate escalation flow updated to match.
- **Routing reference added to workflow.md.** New section explicitly distinguishing skills (slash-prefixed names like `/plan`, `/debug`, `/idea`, invoke via Skill tool) from agents (plain names like `scrum-master`, `delivery-agent`, dispatch via Task tool). Calls out that a few names exist as both (e.g. `architect`) and that `forgebee:plan` is not a valid `subagent_type`. Added matching "Never" rule.

### Added — Tool Discipline (CLAUDE.md)

New "Tool Discipline (always apply)" section between Core Principles and Agent Output Modes — inherited by every agent and orchestrator via CLAUDE.md injection. Five rules targeting the unbounded-discovery failure mode:

- **T1 — Prefer `rg` over `grep -r`.** 10-50x faster; respects `.gitignore` so `vendor/`, `node_modules/`, `.git/`, build artifacts are excluded for free.
- **T2 — Bound every discovery search.** Bare `grep -r pattern .` or unscoped `rg pattern` on an unfamiliar tree is a P3 violation. Pick one: scope, type filter, or `timeout N` cap.
- **T3 — Map structure before searching content.** `Glob` (or `ls`/`fd`) the tree first, then `rg` on the narrowed scope. WordPress `wp-content/`, plugin folders, and monorepo roots routinely contain MBs of third-party PHP — blanket `grep -r` will hang for minutes.
- **T4 — Explicit exclusions when no `.gitignore`.** `vendor/`, `node_modules/`, `.git/`, `build/`, `dist/`, `.next/`, `target/`, `__pycache__/`. Example: `rg pattern --glob '!vendor' --glob '!node_modules'`.
- **T5 — Background or cancel after 60s.** A discovery command that hasn't returned in ~60s is almost certainly stuck on a vendored subtree — `ctrl+b` to background or cancel and re-scope. Never silently wait past 2 minutes for what should be sub-second work.

### Why a patch, not a minor

Both changes harden existing behavior rather than add functionality — no new skills, agents, or commands. The Tool Discipline rules formalize discipline that *should* have applied since 5.0, and the routing fix corrects a documentation bug. Pure corrective release.

---

## [5.1.1] — 2026-05-19

**Theme: post-release polish + permission-guard fixes.** Patch release addressing audit findings, defensive hook hardening, and friction in the permission system that surfaced after 5.1.0 shipped.

### Fixed — Permission guard

- **Permission mode detection bug.** `detectPermissionMode()` only read root-level `settings.defaultMode`, missed the nested `settings.permissions.defaultMode` shape Claude Code actually uses. Combined with `skipDangerousModePermissionPrompt: true`, this caused auto-mode users to be detected as `bypassPermissions`, which then exited the guard silently and let Claude Code's classifier ask about every command. Now checks (in priority): `settings.permissions.defaultMode` → `settings.defaultMode` → flag fallbacks → `default`. Also reads project-local `.claude/settings.json` for per-project override.
- **Auto mode now genuinely complements the classifier.** Previously the guard ran Tier 0 (blocklist) only in auto mode, then exited — the classifier was asked about every legitimate dev command. Now Tier 0 + Tier 1 (allowlist) both run in auto mode: known-safe commands get `permissionDecision: 'allow'` upfront so the classifier never sees them; unknown commands still fall through to the classifier.
- **Re-wired `permission-guard.js` into `hooks.json`** (was removed in 4.1.2 for double-gating). Auto-mode conflict that caused the original removal is now fixed by the additive Tier-0-plus-allowlist design.

### Added — Permission allowlist coverage

Substantial expansion for non-destructive dev workflows. Auto mode now pre-approves (no classifier ask) for:

- **Git daily ops:** `checkout`, `merge`, `restore`, `cherry-pick`, `rebase` (non-interactive), `config --get/--list`, `worktree`, `bisect`, `rev-parse`, `reflog`, `whatchanged`, `describe`
- **GitHub CLI:** `gh pr/issue/repo/run/workflow` create/view/list, `gh api ... GET`
- **Package mgmt:** `npm i` short form, `npm exec/create/update/upgrade/prune/cache`, `yarn add/remove`, `pnpm add/remove`, `bun add`
- **Ruby / PHP / .NET:** `bundle install/exec`, `rails *`, `rake *`, `php artisan *`, `composer *`, `dotnet build/test/run`
- **Python tooling:** `pytest`, `tox`, `nox`, `coverage`, `uv *`, `poetry *`, `pipx *`, `hatch *`, `python -m {pytest,unittest,black,ruff,mypy,http.server,pip,venv,build,twine,json.tool}`
- **Docker:** `compose restart/pull/stop/start/top/pause`, `start/stop/restart` (container lifecycle), `pull/tag/history/diff/save/export/cp/commit`, `network/volume/system/context ls/inspect/df`, `buildx`, `dc` shell alias
- **Kubernetes:** `kubectl get/describe/logs/top/config view/cluster-info`, `helm list/status/repo`, `minikube status`, `k9s`
- **Cloud read-only:** `aws ec2 describe-*`, `gcloud compute instances list` (nested subcommands), `az vm list`, `terraform plan/init/validate/fmt/show`
- **DB read-only:** `psql -c "SELECT/SHOW/DESCRIBE/\d/\l"`, `redis-cli info/get/keys/scan`, `pg_dump`, `mongodump`
- **Editors / clipboards:** `code .`, `cursor`, `subl`, `vim`, `nvim`, `open`, `xdg-open`, `pbcopy`, `pbpaste`
- **Search tools:** `fd`/`fdfind` (no `-x`/`--exec`), `locate`/`mlocate`/`plocate`, `ctags`/`etags`/`gtags`/`cscope`, modern viewers (`bat`, `lsd`, `eza`, `delta`, `broot`), structured data (`miller`/`mlr`, `csvkit`, `csvq`, `jc`)
- **Process / monitor:** `htop`, `btop`, `glances`, `iotop`, `atop`, `pidstat`, `lsof -i`, `ss`, `netstat` (read-only)
- **Local scripts:** `./bin/*`, `./scripts/*`, `./tools/*`, `./tasks/*` (project-relative scripts)
- **Build tools:** `gradle`, `gradlew`, `mvn`, `just`, `task`, `mage`, `mise`, `asdf`
- **Bench/docs:** `hyperfine`, `time`, `man`, `tldr`, `info`

### Hardened

- **`xargs` no longer permissive.** Previously `xargs <anything>` was allowlisted, which would have let `find ... | xargs rm` bypass the find guard. Now `xargs` only allows a curated list of safe subcommands (`grep`, `wc`, `cat`, `head`, `tail`, `stat`, etc.).
- **`fd -x` / `fd --exec` now properly excluded.** Previous negative lookahead used `\b` which doesn't anchor between two non-word chars (space and `-`); fixed with `(?<=^|\s)` lookbehind and end-of-string anchoring.
- **`find -ok` properly excluded.** Same `\b` bug; same fix.
- **`auto` mode Tier 0 blocklist enforced.** Auto mode no longer skips dangerous-pattern checks. `rm -rf /etc`, force-push, `curl|bash`, etc. blocked in every mode (compliance baseline).
- **Permission cache normalization tightened.** Previously collapsed any path to `<path>`, letting a cache hit for `rm -rf /tmp/foo` allow `rm -rf /etc`. Now preserves basename + never collapses dangerous prefixes (`/etc`, `/var`, `/usr`, `/root`, `/sys`, etc.).

### Added — Hardening helpers

- **`redactForPrompt()`** helper in `_common.js` — strips API keys (sk-, ghp-, AKIA, slack tokens, JWTs, bearer), emails, UUIDs, private key blocks, and large currency amounts from text before it's included in any prompt-type hook. Available for use by future `TaskCompleted`/`PreCompact`/`Notification` hooks.
- **`FORGEBEE_GUARD_LOG_UNKNOWN=1` env var** — when set, every command that falls through to the classifier gets appended (with timestamp + which subcommands matched) to `.claude/session-cache/unknown-commands.log`. Lets users see exactly what's getting asked and decide which patterns to allowlist.

### Fixed — Description sanitization

- **INDEX.md description injection defense** now operates with curated patterns (not over-aggressive backtick rejection). Detects: curl|sh, ignore-previous attempts, override role frames, command substitution to dangerous calls, backticked shell commands, unicode/RTL overrides. Legitimate markdown backticks pass through.

### Misc

- All 3 deployment locations resynced (source, project-local `.claude/hooks/`, plugin cache). 3 hook scripts missing from project-local copy backfilled (`learn-nudge.js`, `load-index.js`, `permission-denied-logger.js`). 86 plugin-cache files refreshed from source.

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
