---
title: Predicate schemas can close argument vocabularies
status: open
priority: must
tags:
  - ontology
  - modeling
  - vocabulary-convergence
semantic_text: kb_upsert must reject a predicate fact whose argument value is not a declared constant of its schema. kb_upsert must reject a predicate fact that uses an argument alias and name the declared constant to use. kb_suggest_predicates must bind an argument alias to its declared constant. kb_suggest_predicates must leave an argument with an undeclared value unbound.
semantic_clauses:
  - kb_upsert must reject a predicate fact whose argument value is not a declared constant of its schema.
  - kb_upsert must reject a predicate fact that uses an argument alias and name the declared constant to use.
  - kb_suggest_predicates must bind an argument alias to its declared constant.
  - kb_suggest_predicates must leave an argument with an undeclared value unbound.
semantic_inventory_version: kibi.semantic-inventory.v1
semantic_source_field: semantic_text
semantic_source_hash: 663c89d3d1f77db8687795768c46b85b668ba360199d24288768832b054b5549
logic_claims:
  - CLAIM-E9425E1032312CAE
  - CLAIM-9B2E13B0013D801A
  - CLAIM-A877435F3AFCE358
  - CLAIM-9E0114B005425612
semantic_inventory:
  - claim_key: CLAIM-E9425E1032312CAE
    claim_text: kb_upsert must reject a predicate fact whose argument value is not a declared constant of its schema
    role: normative
    status: modeled
    span:
      start: 0
      end: 100
    reason: Grounded by a predicate fact over a narrow policy schema with a declared vocabulary.
  - claim_key: CLAIM-9B2E13B0013D801A
    claim_text: kb_upsert must reject a predicate fact that uses an argument alias and name the declared constant to use
    role: normative
    status: modeled
    span:
      start: 102
      end: 206
    reason: Grounded by a predicate fact over a narrow policy schema with a declared vocabulary.
  - claim_key: CLAIM-A877435F3AFCE358
    claim_text: kb_suggest_predicates must bind an argument alias to its declared constant
    role: normative
    status: modeled
    span:
      start: 208
      end: 282
    reason: Grounded by a predicate fact over a narrow policy schema with a declared vocabulary.
  - claim_key: CLAIM-9E0114B005425612
    claim_text: kb_suggest_predicates must leave an argument with an undeclared value unbound
    role: normative
    status: modeled
    span:
      start: 284
      end: 361
    reason: Grounded by a predicate fact over a narrow policy schema with a declared vocabulary.
id: REQ-kibi-predicate-argument-constants
type: req
origin:
  kind: migration
  ref: kibi migrate v5->v6
  recorded_at: '2026-10-04T01:17:15.284Z'
---
kb_upsert must reject a predicate fact whose argument value is not a declared constant of its schema. kb_upsert must reject a predicate fact that uses an argument alias and name the declared constant to use. kb_suggest_predicates must bind an argument alias to its declared constant. kb_suggest_predicates must leave an argument with an undeclared value unbound.
