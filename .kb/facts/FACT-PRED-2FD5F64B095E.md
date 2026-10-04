---
id: FACT-PRED-2FD5F64B095E
title: Missing opt-in logs do not invent evidence
status: active
created_at: 2026-08-10T00:00:00.000Z
updated_at: 2026-08-10T00:00:00.000Z
source: documentation/requirements/REQ-kibi-telemetry-acceptance-gate.md
tags:
  - lane:ontology
  - telemetry
  - diagnostics
fact_kind: predicate
predicate_namespace: kibi.requirements
predicate_name: logical_requirement_rule
predicate_args:
  - kibi.telemetry.acceptance
  - avoid_fabricating_telemetry_evidence
  - skipped
canonical_key: logical_requirement_rule(kibi.telemetry.acceptance,avoid_fabricating_telemetry_evidence,skipped)
polarity: assert
claim_key: CLAIM-A750757F5BC9A560
claim_text: An absent opt-in usage log must not fabricate telemetry evidence
claim_span_start: 1131
claim_span_end: 1195
type: fact
origin:
  kind: migration
  ref: kibi migrate v5->v6
  recorded_at: '2026-10-04T01:17:15.284Z'
---

Ground representation of opt-in log absence semantics.
