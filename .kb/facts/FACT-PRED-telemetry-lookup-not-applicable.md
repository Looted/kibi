---
title: Lookup before first edit is not applicable without a recorded requirement-linked edit
status: active
tags:
  - lane:ontology
  - telemetry
  - acceptance
  - hooks
claim_key: CLAIM-2826A6AB85ACB393
claim_text: The lookup_before_first_edit metric must be not applicable when no host hook recorded an edit of a requirement-linked file
text_ref: .kb/requirements/REQ-kibi-telemetry-acceptance-gate-v2.md
fact_kind: predicate
predicate_name: logical_requirement_rule
predicate_args:
  - kibi.telemetry.acceptance
  - no_requirement_linked_edit_hook_row
  - lookup_before_first_edit_not_applicable
polarity: assert
canonical_key: logical_requirement_rule(kibi.telemetry.acceptance,no_requirement_linked_edit_hook_row,lookup_before_first_edit_not_applicable)
predicate_namespace: kibi.requirements
origin:
  kind: agent
  recorded_at: '2026-10-04T02:14:51.436Z'
id: FACT-PRED-telemetry-lookup-not-applicable
type: fact
---
