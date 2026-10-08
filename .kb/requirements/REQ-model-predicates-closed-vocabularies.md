---
title: Built-in predicate schemas declare closed argument vocabularies
status: open
priority: must
tags:
  - modeling
  - predicates
  - vocabulary
semantic_text: Built-in predicate schemas must declare the allowed constants of each argument with a closed vocabulary. Predicate modeling must list the allowed constants of an unbound argument with a closed vocabulary.
semantic_clauses:
  - Built-in predicate schemas must declare the allowed constants of each argument with a closed vocabulary.
  - Predicate modeling must list the allowed constants of an unbound argument with a closed vocabulary.
logic_claims:
  - CLAIM-17EA6E80A17D81E7
  - CLAIM-5D2310107C38C637
semantic_inventory_version: kibi.semantic-inventory.v1
semantic_source_field: semantic_text
semantic_source_hash: d2d2154ac3290849f643d6f1c4510487b1a9eadc18b3a66951b824bb18f36a4c
semantic_inventory:
  - claim_key: CLAIM-17EA6E80A17D81E7
    claim_text: Built-in predicate schemas must declare the allowed constants of each argument with a closed vocabulary
    role: normative
    status: modeled
    span:
      start: 0
      end: 103
  - claim_key: CLAIM-5D2310107C38C637
    claim_text: Predicate modeling must list the allowed constants of an unbound argument with a closed vocabulary
    role: normative
    status: modeled
    span:
      start: 105
      end: 203
origin:
  kind: agent
  recorded_at: '2026-10-08T15:34:58.375Z'
id: REQ-model-predicates-closed-vocabularies
type: req
---
Built-in predicate schemas must declare the allowed constants of each argument with a closed vocabulary. Predicate modeling must list the allowed constants of an unbound argument with a closed vocabulary.

## Context

In an onboarding run on a test project none of 33 binding hints carried `allowedValues`, because no built-in predicate schema declared `argument_constants`; the triggers, decisions and refresh policies the agent could not bind were left without a closed list to choose from, although Kibi's own ontology-quality rule recommends declaring constants for such arguments. Arguments with a natural vocabulary now declare it, with aliases for common spellings.

## Source

Onboarding evaluation round 7 analysis (2026-10-08), finding K15.