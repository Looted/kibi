---
id: FACT-PRED-4CCA58034E58
title: Recovery signals require complete requirement coverage
status: active
created_at: 2026-08-10T00:00:00.000Z
updated_at: 2026-08-10T00:00:00.000Z
source: documentation/requirements/REQ-kibi-telemetry-acceptance-gate.md
tags:
  - lane:ontology
  - telemetry
  - coverage
  - receipts
fact_kind: predicate
predicate_namespace: kibi.requirements
predicate_name: logical_requirement_rule
predicate_args:
  - kibi.telemetry.acceptance
  - use_complete_requirement_coverage_events
  - proof_and_receipt_metrics
canonical_key: logical_requirement_rule(kibi.telemetry.acceptance,use_complete_requirement_coverage_events,proof_and_receipt_metrics)
polarity: assert
claim_key: CLAIM-46FCE7D8D88A8AC5
claim_text: Proof recovery and receipt freshness must use complete requirement-coverage events instead of partial or non-requirement reports
claim_span_start: 798
claim_span_end: 926
type: fact
---

Ground representation of complete-scope proof and receipt telemetry.
