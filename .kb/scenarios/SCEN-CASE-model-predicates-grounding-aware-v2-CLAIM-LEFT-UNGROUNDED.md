---
title: A grounding replacement that would leave the claim ungrounded is flagged and rolled back
status: active
expects: rejection
tags:
  - negative-path
  - edge-case
origin:
  kind: agent
  recorded_at: '2026-10-30T15:00:22.762Z'
id: SCEN-CASE-model-predicates-grounding-aware-v2-CLAIM-LEFT-UNGROUNDED
type: scenario
---
Given a requirement whose claim is grounded by a requires_property fact and a complete predicate candidate that fits it, when predicate modeling returns the replacement plan, then the plan retracts the old link and adds the predicate link back to back so the claim ends with exactly one grounding, names the step between them where the claim has none as the one kb_check flags under logic-coverage, and gives a rollback that restores the old link if kb_check is not clean after the last step, so the claim is never left with zero groundings.

The test case "grounded claim with a complete candidate answers replace_grounding with no write plan and a consistent replacement plan" in packages/cli/tests/operations/suggest-predicates-existing-grounding.test.ts exercises it. It covers the value below the bound, `lt 1`, of grounding relationships per claim.