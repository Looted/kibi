---
id: FACT-PRED-A29952A9FDA9
title: Validation correlation requires an exact recent preflight
status: active
created_at: 2026-08-10T00:00:00.000Z
updated_at: 2026-08-10T00:00:00.000Z
source: .kb/requirements/REQ-kibi-telemetry-acceptance-gate.md
tags:
  - lane:ontology
  - telemetry
  - validation
fact_kind: property_value
subject_key: kibi.telemetry.acceptance
property_key: correlated_preflight_age_before_upsert_minutes
operator: lte
value_type: int
value_int: 60
claim_key: CLAIM-A632F920AC680BA9
claim_text: Validation correlation must match the canonical payload and a successful preflight no more than one hour before the upsert
claim_span_start: 534
claim_span_end: 656
type: fact
origin:
  kind: migration
  ref: kibi migrate v5->v6
  recorded_at: '2026-10-04T01:17:15.284Z'
---

Ground representation of payload-bound validation correlation.
