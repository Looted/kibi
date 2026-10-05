---
title: Applying a compile plan requires its returned plan hash
status: active
tags:
  - lane:ontology
  - planning
  - apply-plan
claim_key: CLAIM-875CFEE228088FD0
claim_text: Applying a compile plan must require the returned plan hash
text_ref: .kb/requirements/REQ-kibi-change-to-proof-plan-compiler-v2.md
fact_kind: predicate
predicate_name: logical_requirement_rule
predicate_args:
  - kibi.plan.apply
  - compile_plan_application
  - requires_returned_plan_hash
polarity: assert
canonical_key: logical_requirement_rule(kibi.plan.apply,compile_plan_application,requires_returned_plan_hash)
predicate_namespace: kibi.requirements
origin:
  kind: agent
  recorded_at: '2026-10-04T02:20:08.923Z'
id: FACT-PRED-plan-apply-hash-guard
type: fact
---
