---
id: FACT-PRED-21C26F8E64F4
title: Telemetry acceptance measures seven workflow signals
status: superseded
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
  - measure_required_workflow_metrics
  - seven_metric_report
canonical_key: logical_requirement_rule(kibi.telemetry.acceptance,measure_required_workflow_metrics,seven_metric_report)
polarity: assert
claim_key: CLAIM-93F9FFAAA609B054
claim_text: The report must measure telemetry completeness, semantic-advisor use before requirement writes, exact validation before upserts, source-linked zero-result rate, proof-gap recovery, E2E receipt freshness, and repeated mutation failures
claim_span_start: 298
claim_span_end: 532
type: fact
origin:
  kind: migration
  ref: kibi migrate v5->v6
  recorded_at: '2026-10-04T01:17:15.284Z'
---

Ground representation of the required telemetry metric inventory.
