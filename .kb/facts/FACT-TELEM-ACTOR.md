---
id: FACT-TELEM-ACTOR
title: Usage evidence preserves opaque actor identity
status: active
created_at: 2026-08-10T00:00:00.000Z
updated_at: 2026-08-10T00:00:00.000Z
source: .kb/requirements/REQ-kibi-telemetry-remediation-evidence.md
tags:
  - lane:ontology
  - telemetry
  - correlation
fact_kind: property_value
subject_key: kibi.telemetry.remediation
property_key: usage_records_dropping_supplied_actor_identifier
operator: eq
value_type: int
value_int: 0
claim_key: CLAIM-CDA785CDD47FBA8A
claim_text: Every usage record must preserve a supplied opaque actor identifier
claim_span_start: 256
claim_span_end: 323
type: fact
origin:
  kind: migration
  ref: kibi migrate v5->v6
  recorded_at: '2026-10-04T01:17:15.284Z'
---

Ground representation of actor correlation identity.
