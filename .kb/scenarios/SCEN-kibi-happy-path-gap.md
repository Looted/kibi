---
title: A rejection scenario that assumes a forbidden value closes the failure side
status: active
expects: success
origin:
  kind: agent
  recorded_at: '2026-10-29T22:35:00.000Z'
id: SCEN-kibi-happy-path-gap
type: scenario
---
Steps:

1. Author a requirement that grounds remaining quota above zero and a success scenario that assumes a quota of five: kibi coverage reports the happy_path_only gap, the negativePath stage is missing, and its suggestion assumes a quota of zero with expects rejection.
2. Add a rejection scenario that assumes a quota of five: kibi check reports it as scenario-outcome-mismatch, because the requirement permits it, and the gap stays.
3. Change that scenario to assume a quota of zero: the mismatch is gone, the stage passes and names the scenario.
4. On a requirement with no scenario, a failure_side_waiver reason alone keeps the gap and proof explain says it awaits approval; adding failure_side_waiver_approved_by moves the stage to waived.
