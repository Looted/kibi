---
title: Telemetry acceptance measures lookup before each session's first requirement-linked edit
status: active
tags:
  - lane:ontology
  - telemetry
  - acceptance
  - hooks
claim_key: CLAIM-DB97AA4726C06D6A
claim_text: The lookup_before_first_edit metric must report, for each host session, whether kb_search or kb_query ran before the session's first edit of a requirement-linked file
text_ref: .kb/requirements/REQ-kibi-telemetry-acceptance-gate-v2.md
fact_kind: predicate
predicate_name: logical_requirement_rule
predicate_args:
  - kibi.telemetry.acceptance
  - lookup_before_first_requirement_linked_edit_per_session
  - lookup_before_first_edit_rate
polarity: assert
canonical_key: logical_requirement_rule(kibi.telemetry.acceptance,lookup_before_first_requirement_linked_edit_per_session,lookup_before_first_edit_rate)
predicate_namespace: kibi.requirements
origin:
  kind: agent
  recorded_at: '2026-10-04T02:14:48.800Z'
id: FACT-PRED-telemetry-lookup-before-first-edit
type: fact
---
