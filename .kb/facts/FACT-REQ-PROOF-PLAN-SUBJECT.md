---
id: FACT-REQ-PROOF-PLAN-SUBJECT
title: Kibi change-to-proof plan subject
status: active
created_at: 2026-08-13T00:00:00.000Z
updated_at: 2026-08-13T00:00:00.000Z
tags:
  - lane:strict
  - planning
  - traceability
fact_kind: subject
subject_key: kibi.proof.change_plan
canonical_key: kibi
type: fact
origin:
  kind: migration
  ref: kibi migrate v5->v6
  recorded_at: '2026-10-04T01:17:15.284Z'
---

The read-only plan Kibi compiles from a natural-language change request, with a clause-complete proposition ledger and required evidence, and its all-or-nothing apply that needs the returned plan hash and keeps a recovery journal. It is the plan and its apply, not the evaluation fixtures that measure it (kibi.proof.change_evaluation).
