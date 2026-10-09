---
title: Predicate modeling never binds a participant argument to the requirement's subject key
status: open
tags:
  - modeling
  - predicates
  - bindings
  - review:context-missing
priority: must
origin:
  kind: agent
  ref: 'Piotr thread 2026-10-09: onboarding evaluation round 9 finding K19, subject key offered as actor'
  recorded_at: '2026-10-09T07:23:35.039Z'
semantic_text: Predicate modeling must leave a participant argument unbound when its value equals a subject key the requirement constrains. Predicate binding hints must offer requirement subject keys only for the subject argument and for entity arguments. Predicate binding hints must say that the schema does not fit the claim when the claim names no participant.
logic_claims:
  - CLAIM-E9DC5E280EE6EDCD
  - CLAIM-E0B4CA53786DA7B1
  - CLAIM-796D6EBB22F37F5E
semantic_clauses:
  - Predicate modeling must leave a participant argument unbound when its value equals a subject key the requirement constrains.
  - Predicate binding hints must offer requirement subject keys only for the subject argument and for entity arguments.
  - Predicate binding hints must say that the schema does not fit the claim when the claim names no participant.
semantic_inventory_version: kibi.semantic-inventory.v1
semantic_source_field: semantic_text
rationale: An Oct 9 2026 onboarding evaluation on a test project received a permission_rule binding hint that offered the requirement's subject key as the actor, so the agent bound a component name where the schema expects a participant and the resulting fact named nobody.
semantic_source_hash: 0a9a17a5197786d0bb366a14ca8a90ada9b43aefb36b0229ffd4faa807b485fd
semantic_inventory:
  - claim_key: CLAIM-E9DC5E280EE6EDCD
    claim_text: Predicate modeling must leave a participant argument unbound when its value equals a subject key the requirement constrains
    role: normative
    status: modeled
    span:
      start: 0
      end: 123
  - claim_key: CLAIM-E0B4CA53786DA7B1
    claim_text: Predicate binding hints must offer requirement subject keys only for the subject argument and for entity arguments
    role: normative
    status: modeled
    span:
      start: 125
      end: 239
  - claim_key: CLAIM-796D6EBB22F37F5E
    claim_text: Predicate binding hints must say that the schema does not fit the claim when the claim names no participant
    role: normative
    status: modeled
    span:
      start: 241
      end: 348
id: REQ-model-predicates-participant-not-subject
type: req
---
Predicate modeling must leave a participant argument unbound when its value equals a subject key the requirement constrains. Predicate binding hints must offer requirement subject keys only for the subject argument and for entity arguments. Predicate binding hints must say that the schema does not fit the claim when the claim names no participant.

## Context

Round 9 of the onboarding evaluation on a test project modeled a claim that names no actor against permission_rule, and the binding hint listed the requirement's subject key among the actor examples. A subject key names the component the requirement is about, which the predicate fact already carries as its subject_key; it is never a participant. For actor, actor_scope, role and owner arguments the hint must name the missing participant and point to record_ontology_gap when the schema does not fit, and an explicit actor binding equal to the constrained subject key must be rejected with that reason. Requested by the project owner after the evaluation report.

## Source

> Onboarding evaluation round 9, finding K19: buildBindingHints must not offer the requirement subject key as actor; subject keys only for the subject argument and entity-typed arguments; when the claim names no participant the hint says so and points to record_ontology_gap.