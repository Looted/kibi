---
id: FACT-TELEM-EVENT-FIELDS
title: Event remediation preserves exact audit coordinates
status: active
created_at: 2026-08-10T00:00:00.000Z
updated_at: 2026-08-10T00:00:00.000Z
source: .kb/requirements/REQ-kibi-telemetry-remediation-evidence.md
tags:
  - lane:ontology
  - telemetry
  - remediation
  - audit
fact_kind: property_value
subject_key: kibi.telemetry.remediation
property_key: event_remediations_missing_available_audit_field
operator: eq
value_type: int
value_int: 0
claim_key: CLAIM-44E8E0E1CE004387
claim_text: Every event remediation must identify its log line, request identifier, timestamp, tool, target, reason, repair action, session identifier, and actor identifier when available
claim_span_start: 696
claim_span_end: 871
type: fact
origin:
  kind: migration
  ref: kibi migrate v5->v6
  recorded_at: '2026-10-04T01:17:15.284Z'
---

Ground representation of exact event-level repair evidence.
