# tdd-enforcer — Reference Material

Sections extracted from `forgebee/agents/tdd-enforcer.md` to keep the persona file under the 250-line budget. The agent file holds discipline and Never rules — this file holds the working library.

---

## Pre-Implementation Protocol

### Step 1: Analyze the Task

Read the task/story and extract:
- **Behaviors** — what should the code DO?
- **Inputs** — what goes in?
- **Outputs** — what comes out?
- **Edge cases** — what could go wrong?
- **Error conditions** — what should be rejected?

### Step 2: Define Required Tests

For each behavior, specify the test:

```markdown

## Required Tests Before Implementation

### [Feature/Function Name]

1. **Happy path:** should [expected behavior] when [normal input]
   - Input: [specific input]
   - Expected: [specific output]

2. **Edge case:** should [expected behavior] when [boundary input]
   - Input: [edge case]
   - Expected: [specific output]

3. **Error case:** should [expected behavior] when [invalid input]
   - Input: [invalid input]
   - Expected: [error type or rejection]

### Test Checklist
- [ ] All happy paths covered
- [ ] Boundary values tested
- [ ] Error conditions tested
- [ ] Null/empty/undefined handled
- [ ] Async behavior tested (if applicable)
- [ ] Integration points mocked appropriately
```

### Step 3: Verify RED Phase

Before allowing implementation:

```bash
# Run the new tests — they MUST fail
npm test -- --testPathPattern="[new-test-file]" 2>&1
echo "Exit code: $?"
```

**Required result: tests FAIL (exit code 1)**

If tests pass without implementation → the tests are wrong. They're not testing new behavior. Reject them.

### Step 4: Allow GREEN Phase

Only after RED is confirmed:
- Allow the minimum implementation to make tests pass
- No extra code, no premature optimization, no "while I'm here" additions

```bash
# Verify GREEN — all tests pass now
npm test 2>&1 | tail -20
echo "Exit code: $?"
```

**Required result: ALL tests pass (exit code 0)**

### Step 5: Allow REFACTOR Phase

Only after GREEN is confirmed:
- Allow cleanup, extraction, renaming
- Tests must stay green throughout

```bash
# Verify still GREEN after refactor
npm test 2>&1 | tail -20
echo "Exit code: $?"
```


## Post-Implementation Audit

### Check 1: Test-to-Code Ratio

```bash
# Count new test lines vs new implementation lines
git diff --stat HEAD~1 -- "**/*.test.*" "**/*.spec.*" "**/test_*" "**/*_test.*"
git diff --stat HEAD~1 -- --not "**/*.test.*" "**/*.spec.*" "**/test_*" "**/*_test.*"
```

Rule of thumb: test code should be >= 60% of implementation code

### Check 2: Coverage of New Code

```bash
# Run coverage for changed files only
npm test -- --coverage --changedSince=HEAD~1 2>&1 | tail -30
```

Minimum thresholds:
- **Statements:** 80%+
- **Branches:** 75%+
- **Functions:** 90%+
- **Lines:** 80%+

### Check 3: Test Quality

Read each new test and check:

| Quality Check | Pass/Fail |
|--------------|-----------|
| Tests behavior, not implementation | |
| One assertion per test (or closely related group) | |
| Descriptive test names (should...when...) | |
| No test interdependencies | |
| Mocks external deps only, not internal logic | |
| AAA structure (Arrange-Act-Assert) | |
| No hardcoded magic values without explanation | |
| Edge cases covered | |

### Check 4: Git History Order

```bash
# Verify tests were committed before or with implementation
git log --oneline --diff-filter=A -- "**/*.test.*" "**/*.spec.*" | head -5
git log --oneline --diff-filter=A -- "src/**" "lib/**" | head -5
```

If implementation files appear in commits BEFORE their test files → TDD violation.


## Audit Verdict

```markdown

## TDD Audit Report

**Task:** [description]
**Verdict:** TDD COMPLIANT | PARTIAL COMPLIANCE | TDD VIOLATION

### Cycle Verification
| Phase | Status | Evidence |
|-------|--------|----------|
| RED (tests fail first) | PASS/FAIL | [git log or test output] |
| GREEN (minimal impl) | PASS/FAIL | [test pass output] |
| REFACTOR (clean + green) | PASS/FAIL | [test still passing] |

### Coverage
| Metric | Value | Threshold | Status |
|--------|-------|-----------|--------|
| Statements | X% | 80% | PASS/FAIL |
| Branches | X% | 75% | PASS/FAIL |
| Functions | X% | 90% | PASS/FAIL |

### Test Quality Score: X/8

### Violations Found
- [List any TDD violations with specific files and line numbers]

### Required Actions
- [What must be fixed before this is accepted]
```
