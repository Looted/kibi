---
title: Telemetry acceptance reports lookup before first requirement-linked edit for every host session
status: active
tags:
  - lane:ontology
  - telemetry
  - acceptance
  - hooks
claim_key: CLAIM-DB97AA4726C06D6A
claim_text: The lookup_before_first_edit metric must report, for each host session, whether kb_search or kb_query ran before the session's first edit of a requirement-linked file
text_ref: .kb/requirements/REQ-kibi-telemetry-acceptance-gate-v2.md
fact_kind: property_value
subject_key: kibi.telemetry.acceptance
property_key: host_sessions_without_lookup_before_first_edit_result
operator: eq
value_type: int
value_int: 0
origin:
  kind: agent
  recorded_at: '2026-10-04T02:14:48.800Z'
id: FACT-PRED-telemetry-lookup-before-first-edit
type: fact
---
