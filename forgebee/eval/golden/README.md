# Golden-task eval (prompt-output regression)

ForgeBee's deliverable is prompts, but the JS harness (`forgebee/eval/scenarios/`)
only tests JS and `audit-self` only scores prompt **structure**. This layer tests
prompt **output**: feed a planted fixture to a review skill and assert the model
actually flags the planted issue and uses the P6 severity vocabulary + the
machine-parseable footer.

## Run

```bash
node forgebee/eval/golden/run-golden.js --list   # show the plan (no model call)
npm run eval:golden                              # run (needs `claude` on PATH)
```

It is **opt-in** and deliberately **not** part of `npm run check`: it needs a
model in the loop, so it would be non-deterministic and unrunnable in a model-less
CI. When the `claude` CLI is absent it prints `SKIP` and exits 0 — never breaks a
pipeline. Override the model with `FORGEBEE_GOLDEN_MODEL`, the timeout with
`FORGEBEE_GOLDEN_TIMEOUT_MS`.

## How it works

`run-golden.js` builds a prompt from `forgebee/skills/<skill>/SKILL.md` +
`_review-finding-contract.md` + the fixture, runs it through `claude -p`, and
checks the output against the rubric in `tasks.json`:

| Rubric field | Asserts |
|---|---|
| `expectAll` | every string present (case-insensitive) |
| `expectAny` | at least one present |
| `mustUseSeverity` | output uses Critical/High/Medium/Low (P6) |
| `mustHaveFooter` | output ends with `SCORE: … \| verdict: …` |

## Add a task

1. Drop a fixture with a **planted, synthetic** issue in `fixtures/` (no real data/secrets).
2. Add a rubric entry to `tasks.json` (`id`, `skill`, `fixture`, `expectAll`/`expectAny`, `mustUseSeverity`, `mustHaveFooter`).
3. `--list` to confirm it's wired, then `npm run eval:golden`.

Keep fixtures small and single-purpose — one planted issue class per file makes a
failure unambiguous (did the skill regress on *that* class?).
