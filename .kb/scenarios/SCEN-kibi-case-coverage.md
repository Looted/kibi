---
title: A rejection scenario past the bound closes the edge-case gap
status: active
expects: success
origin:
  kind: agent
  recorded_at: '2026-10-30T15:00:00.000Z'
id: SCEN-kibi-case-coverage
type: scenario
---
Steps:

1. Ask the semantic advisor about "An upload batch must hold at most 5 files": the strict-property suggestion previews eq 5, gt 5, eq 0 and eq 1, with gt 5 predicted refused.
2. Ground the claim on files_per_batch lte 5: kibi coverage reports the uncovered_case gap, the cases stage is missing, kibi coverage --cases lists gt 5, proof explain says to add a scenario that assumes it and expects rejection, and the repair plan carries a draft scenario for it.
3. Add a draft scenario that assumes files_per_batch eq 6 and expects rejection: the gap stays.
4. Make it active: the case is covered and the stage passes.
5. A case_waiver reason alone keeps the gap; adding case_waiver_approved_by moves the stage to waived.
