# Review Finding Contract (shared)

> Canonical output format for every `review-*` skill. Read by `review-all` and `/audit-self` to aggregate findings across domains. Keep findings concrete, severity-tagged, and machine-parseable.

## Severity (CLAUDE.md P6 — the only allowed vocabulary)

| Severity | Blocks merge? | Meaning |
|----------|--------------|---------|
| **Critical** | YES | Ship-stopper: data loss, secret exposure, auth bypass, injection, corruption. |
| **High** | YES | Must fix before next sprint: missing error handling at a trust boundary, N+1 on a hot path, XSS, broken access control. |
| **Medium** | No | Fix when convenient: DRY violations, missing edge cases, unclear naming. |
| **Low** | No | Nice-to-have: missing docblocks, minor style, optional optimizations. |

Do NOT introduce alternate words (Warning, Suggestion, Info, Nit). They break cross-skill aggregation.

## Finding block

Each finding uses this shape:

```
[Critical|High|Medium|Low] <one-line title>
File: <path>:<line>
Issue: <what is wrong, concretely>
Fix: <specific remediation>
```

Domain skills MAY add one extra labeled line (e.g. `WCAG:`, `CWE:`, `Route:`, `Data risk:`) but must keep the four lines above.

## Quality score (0-100)

Score the reviewed diff, not the whole codebase. Start at 100 and deduct:

- Each **Critical**: −25
- Each **High**: −10
- Each **Medium**: −3
- Each **Low**: −1

Floor at 0. A diff with any open Critical or High cannot score above 74 and `verdict` is `block`. Clean of Critical/High → `verdict: pass` (Medium/Low are recommendations, not blockers).

## Machine-parseable footer (required, last line of every review)

Emit this exact line so `review-all` and `/audit-self` can aggregate:

```
SCORE: <0-100> | {critical:N, high:N, medium:N, low:N} | verdict: <pass|block>
```

Example: `SCORE: 62 | {critical:0, high:3, medium:2, low:4} | verdict: block`
