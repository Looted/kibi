---
title: Predicate subjects pair with the requirement's subject by argument name or subject key
status: open
priority: must
tags:
  - modeling
  - predicates
  - bindings
semantic_text: Predicate modeling must bind the constrained subject key of the requirement to the argument the schema names subject in any position. Predicate modeling must record the constrained subject key of the requirement as the subject key of the predicate fact when the schema names no subject argument. Predicate modeling must offer a grounding plan only for a predicate about a subject the requirement constrains. Predicate modeling must leave the subject argument unbound for a requirement without a subject fact.
semantic_inventory_version: kibi.semantic-inventory.v1
semantic_source_field: semantic_text
semantic_source_hash: 1539e00175206c9d79024f7d0a445a3bee3491262877738d63857dc2860316be
semantic_inventory:
  - claim_key: CLAIM-02F29EACDBB39DB5
    claim_text: Predicate modeling must bind the constrained subject key of the requirement to the argument the schema names subject in any position
    role: normative
    span:
      start: 0
      end: 132
    status: modeled
  - claim_key: CLAIM-76F30260A16D0E1D
    claim_text: Predicate modeling must record the constrained subject key of the requirement as the subject key of the predicate fact when the schema names no subject argument
    role: normative
    span:
      start: 134
      end: 294
    status: modeled
  - claim_key: CLAIM-3DCEEFDFC309E017
    claim_text: Predicate modeling must offer a grounding plan only for a predicate about a subject the requirement constrains
    role: normative
    span:
      start: 296
      end: 406
    status: modeled
  - claim_key: CLAIM-139A118D7DD550F8
    claim_text: Predicate modeling must leave the subject argument unbound for a requirement without a subject fact
    role: normative
    span:
      start: 408
      end: 507
    status: modeled
logic_claims:
  - CLAIM-02F29EACDBB39DB5
  - CLAIM-76F30260A16D0E1D
  - CLAIM-3DCEEFDFC309E017
  - CLAIM-139A118D7DD550F8
origin:
  kind: agent
  recorded_at: '2026-10-08T21:05:28.021Z'
id: REQ-model-predicates-requirement-subject-v2
type: req
---
Predicate modeling must bind the constrained subject key of the requirement to the argument the schema names subject in any position. Predicate modeling must record the constrained subject key of the requirement as the subject key of the predicate fact when the schema names no subject argument. Predicate modeling must offer a grounding plan only for a predicate about a subject the requirement constrains. Predicate modeling must leave the subject argument unbound for a requirement without a subject fact.

## Context

Round 8 of the external onboarding evaluation applied a kb_model replacement plan for a permission_rule predicate, a schema without a subject argument, and kb_check still reported strict-req-fact-pairing because the requirement's subject was bound into the first argument. This supersedes REQ-model-predicates-requirement-subject: the subject now binds the argument named subject wherever it sits, a schema without one records the subject as the predicate fact's subject_key, and a predicate that would not pair is not offered for grounding. Requested by the project owner after the evaluation report.

## Source

> Onboarding evaluation round 8, finding K16: kb_model binds the requirement subject by argument name, sets subject_key for schemas without a subject argument, and recommends replace_grounding only for a paired predicate.
