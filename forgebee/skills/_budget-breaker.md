# Budget Circuit Breaker (shared reference)

> Cited by `/workflow` and `/team`. Best-effort orchestrator guidance — **no hook
> enforces this**, so the orchestrator self-honors it. Guards against runaway
> dispatch fan-out (e.g. a skeptic spawning a sub-debate that spawns another).

## Envelope

Every `Task()` dispatch carries a budget; sub-dispatches increment `hopCount` and
re-pass the same envelope:

```json
{ "budget": { "hopCount": 1, "maxHops": 8, "maxTokens": null, "maxUsd": null } }
```

## Rules

- `hopCount` starts at 1 (the first dispatch is hop 1); each sub-dispatch increments it.
- Reject a dispatch that would push `hopCount > maxHops` with `HOP_LIMIT_EXCEEDED`.
- `maxHops` default **8**, absolute ceiling **64** — never accept or set higher.
- `maxTokens` / `maxUsd` optional; if set, reject with `TOKEN_LIMIT_EXCEEDED` / `USD_LIMIT_EXCEEDED`.
- Surface a trip to the **user** with the full dispatch chain + reason, and log it to `.claude/audit/`.

## Oracle-leakage defense (multi-tenant / untrusted fan-out only)

When dispatches may cross a trust boundary (untrusted or multi-tenant peers), error
strings sent **to peer agents** must be **constants only** — never echo current or
remaining budget, so a malicious peer can't probe thresholds. Full budget state is
allowed to the user and the audit log, never to the triggering peer. `--debug-budget`
dumps the full envelope to the user on every dispatch (debugging only — leaves the
oracle gap open for that run).

For a single-user pipeline (the common case) the hop counter alone is enough; the
oracle-leakage rules are dead weight unless you actually fan out to untrusted peers.
