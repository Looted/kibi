---
id: FACT-PRED-A4FBBF88EA6B
title: Uncheckable telemetry remains insufficient
status: active
created_at: 2026-08-10T00:00:00.000Z
updated_at: 2026-08-10T00:00:00.000Z
source: .kb/requirements/REQ-kibi-telemetry-acceptance-gate.md
tags:
  - lane:ontology
  - telemetry
  - acceptance
fact_kind: predicate
predicate_namespace: kibi.requirements
predicate_name: logical_requirement_rule
predicate_args:
  - kibi.telemetry.acceptance
  - classify_stale_future_empty_partial_unobservable
  - insufficient_evidence
canonical_key: logical_requirement_rule(kibi.telemetry.acceptance,classify_stale_future_empty_partial_unobservable,insufficient_evidence)
polarity: assert
claim_key: CLAIM-09AD7C82E721C27F
claim_text: Stale, future-dated, empty, partial, or unobservable evidence must remain insufficient
claim_span_start: 210
claim_span_end: 296
type: fact
origin:
  kind: migration
  ref: kibi migrate v5->v6
  recorded_at: '2026-10-04T01:17:15.284Z'
---

Ground representation of fail-closed observability semantics.
