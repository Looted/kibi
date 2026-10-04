---
id: FACT-PRED-013AE2CA693B
title: Three target failures breach retry discipline
status: active
created_at: 2026-08-10T00:00:00.000Z
updated_at: 2026-08-10T00:00:00.000Z
source: documentation/requirements/REQ-kibi-telemetry-acceptance-gate.md
tags:
  - lane:ontology
  - telemetry
  - mutation
  - retry
fact_kind: predicate
predicate_namespace: kibi.requirements
predicate_name: logical_requirement_rule
predicate_args:
  - kibi.telemetry.acceptance
  - fail_after_three_consecutive_target_failures
  - failed_metric
canonical_key: logical_requirement_rule(kibi.telemetry.acceptance,fail_after_three_consecutive_target_failures,failed_metric)
polarity: assert
claim_key: CLAIM-96B079D7FE47A40C
claim_text: Three consecutive failed upserts for one mutation target must fail the retry-discipline metric
claim_span_start: 928
claim_span_end: 1022
type: fact
origin:
  kind: migration
  ref: kibi migrate v5->v6
  recorded_at: '2026-10-04T01:17:15.284Z'
---

Ground representation of repeated mutation failure detection.
