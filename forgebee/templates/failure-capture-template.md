# Failure Capture: <symptom-or-ticket>

> Fill BEFORE any recovery action. Forces evidence-first debugging.
> Adapted from ECC's agent-introspection-debugging Phase 1.
>
> The 3-fix Iron Law in `debugger-detective` counts attempts. This block
> captures evidence before each attempt — so failed approaches are not
> re-attempted with cosmetic variation.

## Fields

- **Session:** <session id, commit, or timestamp>
- **Goal:** <what was being attempted, one sentence>
- **Error:** <exact error message, stack frame, or log line — quoted verbatim>
- **Last successful step:** <most recent operation that worked, with citation>
- **Last failed tool/command:** <exact tool call or shell command>
- **Repeated pattern:** <Is this a re-attempt? Count: 1/2/3. If 3rd attempt: STOP and escalate per Iron Law>
- **Environment assumptions:** <what about env do we assume? OS, runtime version, env vars, network?>

## Hypothesis (after fields above are filled)

- **What I believe is happening:** <one sentence>
- **What evidence would confirm:** <observable, measurable check>
- **What evidence would refute:** <observable, measurable check>
- **Reversible?** Yes | No (if no: surface to user before acting)

## Action

Now and only now — after capture and hypothesis — propose the recovery action.
