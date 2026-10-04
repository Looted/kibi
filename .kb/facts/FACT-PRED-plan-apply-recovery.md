---
title: The next mutating call settles an interrupted compile plan from its journal
status: active
tags:
  - lane:ontology
  - planning
  - apply-plan
  - recovery
claim_key: CLAIM-0D4D25EDD5C32338
claim_text: The next kb_apply_plan, kb_upsert, or kb_delete call must complete or roll back an interrupted compile plan application from its journal and report which
text_ref: .kb/requirements/REQ-kibi-change-to-proof-plan-compiler-v2.md
fact_kind: predicate
predicate_name: logical_requirement_rule
predicate_args:
  - kibi.plan.apply
  - interrupted_application
  - next_mutating_call_replays_or_rolls_back
polarity: assert
canonical_key: logical_requirement_rule(kibi.plan.apply,interrupted_application,next_mutating_call_replays_or_rolls_back)
predicate_namespace: kibi.requirements
origin:
  kind: agent
  recorded_at: '2026-10-04T02:20:16.147Z'
id: FACT-PRED-plan-apply-recovery
type: fact
---
