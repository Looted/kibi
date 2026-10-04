---
title: A compile plan application writes each committed entity to its authored document
status: active
tags:
  - lane:ontology
  - planning
  - apply-plan
  - rebuild
claim_key: CLAIM-8CE1FEA0B2FA8FFB
claim_text: A compile plan application must write every entity it commits to that entity's authored document, so rebuilding the store from the workspace keeps it
text_ref: .kb/requirements/REQ-kibi-change-to-proof-plan-compiler-v2.md
fact_kind: predicate
predicate_name: logical_requirement_rule
predicate_args:
  - kibi.plan.apply
  - committed_entity
  - written_to_authored_document_survives_rebuild
polarity: assert
canonical_key: logical_requirement_rule(kibi.plan.apply,committed_entity,written_to_authored_document_survives_rebuild)
predicate_namespace: kibi.requirements
origin:
  kind: agent
  recorded_at: '2026-10-04T08:41:14.467Z'
id: FACT-PRED-plan-apply-entity-documents
type: fact
---
