# Investigation: <symptom-or-ticket>

**Opened:** YYYY-MM-DD
**Owner:** <name>
**Status:** Open | Hypothesis ready | Handed off to debugger-detective | Closed

## Stronghold Evidence

<one piece of confirmed evidence with citation — error text, log line, stack
frame, commit. If you don't have a stronghold, do not proceed. Ask the user.>

## Confirmed

- F-001: <directly observed fact>
  - **Cite:** <path:line | log timestamp | commit hash>
- F-002: <fact>
  - **Cite:** <citation>

## Deduced

- D-001: <conclusion that follows from confirmed evidence>
  - **Rests on:** F-001, F-002
  - **Reasoning:** <step-by-step chain — if any step is wrong, the deduction is wrong>

## Hypothesized

- H-001: <plausible explanation>
  - **Would confirm:** <observable, measurable check>
  - **Would refute:** <observable, measurable check>
- H-002 [REFUTED YYYY-MM-DD by F-003]: <plausible-but-refuted explanation>
  - **Refuted because:** <citation explaining why>

## Next Steps (diagnostic, not fixes)

- [ ] <observation to gather>
- [ ] <experiment to run>
- [ ] <log to inspect / dump to capture>

## Promotion Log

<!-- When a hypothesis gets confirmed, promote it: H-NNN → F-NNN. Record here. -->
- H-001 promoted to F-NNN on YYYY-MM-DD (cite: <citation>)

## Handoff

When a hypothesis is confirmed and the fix is clear, hand this case file to
`debugger-detective`. The fix is a separate task — investigation closed.

- **Handed off:** YYYY-MM-DD to debugger-detective
- **With finding:** F-NNN
- **Expected fix:** <one-sentence description, not the fix itself>
