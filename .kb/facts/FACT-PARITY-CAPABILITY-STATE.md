---
id: FACT-PARITY-CAPABILITY-STATE
title: Capability evidence has exactly one explicit state
status: active
fact_kind: property_value
subject_key: kibi.distribution.parity
property_key: states_per_capability_evidence
operator: eq
value_type: int
value_int: 1
canonical_key: kibi.distribution.parity:states_per_capability_evidence:eq:1
created_at: 2026-08-10T00:00:00.000Z
updated_at: 2026-08-10T00:00:00.000Z
tags:
  - lane:ontology
  - parity
  - capability
claim_key: CLAIM-79211E1126113C02
claim_text: Capability evidence must use exactly one state from supported, unsupported, or failed
claim_span_start: 631
claim_span_end: 716
type: fact
origin:
  kind: migration
  ref: kibi migrate v5->v6
  recorded_at: '2026-10-04T01:17:15.284Z'
---

Ground representation of the capability-state sum type.
