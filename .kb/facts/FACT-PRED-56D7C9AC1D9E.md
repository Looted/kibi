---
id: FACT-PRED-56D7C9AC1D9E
title: Telemetry acceptance passes only on fresh complete evidence
status: active
created_at: 2026-08-10T00:00:00.000Z
updated_at: 2026-08-10T00:00:00.000Z
source: documentation/requirements/REQ-kibi-telemetry-acceptance-gate.md
tags:
  - lane:ontology
  - telemetry
  - acceptance
fact_kind: predicate
predicate_namespace: kibi.requirements
predicate_name: logical_requirement_rule
predicate_args:
  - kibi.telemetry.acceptance
  - pass_only_with_fresh_all_metric_evidence
  - passed
canonical_key: logical_requirement_rule(kibi.telemetry.acceptance,pass_only_with_fresh_all_metric_evidence,passed)
polarity: assert
claim_key: CLAIM-AB901A8086704B89
claim_text: The report must pass only when its evidence is no more than seven days old and every applicable metric passes
claim_span_start: 99
claim_span_end: 208
type: fact
origin:
  kind: migration
  ref: kibi migrate v5->v6
  recorded_at: '2026-10-04T01:17:15.284Z'
---

Ground representation of conservative acceptance success.
