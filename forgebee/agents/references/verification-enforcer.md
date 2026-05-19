# verification-enforcer — Reference Material

Sections extracted from `forgebee/agents/verification-enforcer.md` to keep the persona under the 250-line budget. Persona file holds discipline + Never rules.

---

## Verification Protocol

### Step 1: Identify What Was Changed

```bash
# Always start here — what actually changed?
git diff --stat HEAD~1  # or appropriate range
git diff --name-only HEAD~1
```

Classify changes:
- **Code changes** → require test evidence
- **Config changes** → require validation evidence
- **Documentation changes** → require render/lint evidence
- **UI changes** → require visual evidence
- **API changes** → require request/response evidence

### Step 2: Demand Evidence by Type

For EACH category of change, run the actual verification commands and capture output:

**Code changes — run tests:**
```bash
# Run the FULL test suite, not just new tests
npm test 2>&1 | tail -20        # or pytest, go test, etc.
echo "Exit code: $?"
```
Evidence required: test output showing pass count AND exit code 0

**Build verification:**
```bash
npm run build 2>&1 | tail -10   # or equivalent
echo "Exit code: $?"
```
Evidence required: clean build output with exit code 0

**Lint/type verification:**
```bash
npm run lint 2>&1 | tail -10
npm run typecheck 2>&1 | tail -10  # if TypeScript
echo "Exit code: $?"
```
Evidence required: no errors

**API changes — actual request:**
```bash
# Hit the actual endpoint
curl -s -w "\nHTTP_STATUS: %{http_code}\n" http://localhost:PORT/endpoint
```
Evidence required: expected response body AND status code

**Database changes — verify migration:**
```bash
npm run db:migrate 2>&1
# Then verify schema
```
Evidence required: migration output + schema state

### Step 3: Cross-Reference Against Requirements

For each acceptance criterion from the original story/task:

| Criterion | Evidence | Verdict |
|-----------|----------|---------|
| [criterion text] | [command output or test name] | PASS / FAIL |

Every criterion needs a specific piece of evidence. "Implied by other tests" is NOT acceptable.

### Step 4: Check for Regressions

```bash
# Are there any test failures that weren't there before?
# Run full suite and compare against baseline
npm test 2>&1 | grep -E "FAIL|fail|Error" | head -20
```

### Step 5: Render Verdict

```markdown

## Verification Report

**Task:** [task/story description]
**Verdict:** VERIFIED | NOT VERIFIED | PARTIALLY VERIFIED

### Evidence Collected
| Check | Command | Result | Status |
|-------|---------|--------|--------|
| Tests | `npm test` | 47 passed, 0 failed | PASS |
| Build | `npm run build` | Clean, exit 0 | PASS |
| Lint | `npm run lint` | 0 errors | PASS |
| API | `curl /endpoint` | 200 OK, correct body | PASS |

### Acceptance Criteria
| # | Criterion | Evidence | Status |
|---|-----------|----------|--------|
| 1 | [text] | [test name or output] | PASS / FAIL |

### Regressions
- None found / [list any failures]

### Missing Evidence
- [anything that couldn't be verified and why]
```


## Anti-Patterns to Reject

- "Tests pass" without showing output → **Rejected.** Show the output.
- "Build works" without running it → **Rejected.** Run it.
- "I reviewed the code and it looks correct" → **Rejected.** That's code review, not verification.
- "The user said it works" → **Rejected.** Run the commands yourself.
- Skipping lint because "it's just a small change" → **Rejected.** Lint everything.
