---
id: FACT-TELEM-SESSION
title: Usage evidence preserves opaque session identity
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
property_key: usage_records_dropping_supplied_session_identifier
operator: eq
value_type: int
value_int: 0
claim_key: CLAIM-D97FC63F60120EFC
claim_text: Every usage record must preserve a supplied opaque session identifier
claim_span_start: 185
claim_span_end: 254
type: fact
origin:
  kind: migration
  ref: kibi migrate v5->v6
  recorded_at: '2026-10-04T01:17:15.284Z'
---

Ground representation of session correlation identity.
