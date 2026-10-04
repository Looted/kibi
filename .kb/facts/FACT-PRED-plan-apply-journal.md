---
title: A compile plan application journals its writes before the first one
status: active
tags:
  - lane:ontology
  - planning
  - apply-plan
  - journal
claim_key: CLAIM-E6948C655D374651
claim_text: Before its first write, a compile plan application must record a durable journal with the plan hash, the before and after bytes of every workspace file it changes, and every store upsert
text_ref: .kb/requirements/REQ-kibi-change-to-proof-plan-compiler-v2.md
fact_kind: predicate
predicate_name: logical_requirement_rule
predicate_args:
  - kibi.plan.apply
  - before_first_write
  - durable_journal_of_file_bytes_and_store_upserts
polarity: assert
canonical_key: logical_requirement_rule(kibi.plan.apply,before_first_write,durable_journal_of_file_bytes_and_store_upserts)
predicate_namespace: kibi.requirements
origin:
  kind: agent
  recorded_at: '2026-10-04T02:20:13.801Z'
id: FACT-PRED-plan-apply-journal
type: fact
---
