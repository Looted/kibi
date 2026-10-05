---
title: Missing or agent-recorded approvals are non-blocking quality diagnostics
status: active
tags:
  - lane:ontology
  - origin
  - approval
  - checks
claim_key: CLAIM-5AE3601D25967B56
claim_text: kb_check must report exceptions without approved_by, agent-recorded exception approvals without corroboration, and agent-authored current requirements without origin.approved_by as non-blocking quality diagnostics
text_ref: .kb/requirements/REQ-kibi-entity-origin.md
fact_kind: predicate
predicate_name: logical_requirement_rule
predicate_args:
  - kibi.entity.origin
  - missing_or_agent_recorded_approval
  - non_blocking_approval_diagnostics
polarity: assert
canonical_key: logical_requirement_rule(kibi.entity.origin,missing_or_agent_recorded_approval,non_blocking_approval_diagnostics)
predicate_namespace: kibi.requirements
origin:
  kind: agent
  recorded_at: '2026-10-04T02:21:33.396Z'
id: FACT-PRED-entity-origin-approval-advisories
type: fact
---
