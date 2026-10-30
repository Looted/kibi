---
title: A count grounding closes the dimension gap of an every-claim
status: active
expects: success
origin:
  kind: agent
  recorded_at: '2026-10-30T12:10:00.000Z'
id: SCEN-kibi-dimension-gap
type: scenario
---
Steps:

1. Ask the semantic advisor about "The loader must instrument every file loaded into a module": the proposition carries dimension every with the rewrites rule, count and set.
2. Ground the claim on instruments_all_loaded_files eq true: kibi coverage reports the dimension_unrepresented gap, the dimension stage is missing and names the fact, and proof explain prints the rewrites.
3. Ground it on uninstrumented_loaded_files eq 0 instead: the stage is not_required and the gap is gone.
4. A dimension_waiver reason alone keeps the gap and proof explain says it awaits approval; adding dimension_waiver_approved_by moves the stage to waived.
