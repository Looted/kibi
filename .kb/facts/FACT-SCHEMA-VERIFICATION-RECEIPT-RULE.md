---
id: FACT-SCHEMA-VERIFICATION-RECEIPT-RULE
title: Verification receipt rule predicate schema
status: active
created_at: 2026-08-10T00:00:00Z
updated_at: 2026-08-10T00:00:00Z
source: documentation/facts/FACT-SCHEMA-VERIFICATION-RECEIPT-RULE.md
tags: [lane:ontology, predicate-schema, requirements, verification, receipts]
fact_kind: predicate_schema
predicate_namespace: kibi.verification
predicate_name: verification_receipt_rule
predicate_arity: 3
argument_names: [subject, condition, outcome]
argument_types: [entity_kind, verification_condition, proof_result]
argument_descriptions:
  - Verification subject governed by the rule.
  - Canonical receipt, snapshot, or reporting condition.
  - Required evidence or proof outcome.
examples:
  - verification_receipt_rule(current_code_snapshot,newest_receipt,fresh_passing_within_seven_days)
---

Defines the stable project ontology for snapshot-bound execution evidence without conflating ontology predicates with graph relationships.
