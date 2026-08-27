---
title: kb_status read-only operation annotations
status: active
text_ref: documentation/requirements/REQ-002.md
tags:
  - lane:ontology
  - strict-semantics
fact_kind: predicate
polarity: assert
predicate_namespace: kibi.domain
predicate_name: mcp_operation_annotation_policy
predicate_args:
  - kb_status
  - 'true'
  - 'false'
  - 'true'
  - closed_world
canonical_key: mcp_operation_annotation_policy(kb_status,true,false,true,closed_world)
claim_key: CLAIM-F0AB50022F29AA2B
claim_text: In particular, `kb_status` advertises read-only, non-destructive, idempotent, closed-world behavior so clients can inspect branch state without a mutation-approval prompt
id: FACT-KB-STATUS-ANNOTATION-POLICY
type: fact
---
In particular, `kb_status` advertises read-only, non-destructive, idempotent, closed-world behavior so clients can inspect branch state without a mutation-approval prompt.

