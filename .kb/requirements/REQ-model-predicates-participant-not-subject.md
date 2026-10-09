---
title: Predicate modeling never binds a participant argument to the identifier the requirement constrains
status: open
tags:
  - modeling
  - predicates
  - bindings
  - review:context-missing
priority: must
origin:
  kind: agent
  ref: 'Piotr thread 2026-10-09: onboarding evaluation round 9 finding K19, constrained identifier offered as actor'
  recorded_at: '2026-10-09T08:03:57.655Z'
semantic_text: Predicate modeling must leave a participant argument unbound when its value equals a component identifier the requirement constrains. Predicate binding hints must offer the component identifiers the requirement constrains only for the argument that names what the claim is about and for entity arguments. Predicate binding hints must say that the schema does not fit the claim when the claim names no participant.
logic_claims:
  - CLAIM-1AE915E705267617
  - CLAIM-3067C66684409A73
  - CLAIM-796D6EBB22F37F5E
semantic_clauses:
  - Predicate modeling must leave a participant argument unbound when its value equals a component identifier the requirement constrains.
  - Predicate binding hints must offer the component identifiers the requirement constrains only for the argument that names what the claim is about and for entity arguments.
  - Predicate binding hints must say that the schema does not fit the claim when the claim names no participant.
semantic_inventory_version: kibi.semantic-inventory.v1
semantic_source_field: semantic_text
rationale: An Oct 9 2026 onboarding evaluation on a test project received a permission_rule binding hint that offered the identifier the requirement constrains as the actor, so the agent bound a component name where the schema expects a participant and the resulting predicate named nobody.
semantic_source_hash: c3e4dd102d99d0dc99ef3b7d47cd60627ab23258704f8a307708ad35b31a5197
semantic_inventory:
  - claim_key: CLAIM-1AE915E705267617
    claim_text: Predicate modeling must leave a participant argument unbound when its value equals a component identifier the requirement constrains
    role: normative
    status: modeled
    span:
      start: 0
      end: 132
  - claim_key: CLAIM-3067C66684409A73
    claim_text: Predicate binding hints must offer the component identifiers the requirement constrains only for the argument that names what the claim is about and for entity arguments
    role: normative
    status: modeled
    span:
      start: 134
      end: 303
  - claim_key: CLAIM-796D6EBB22F37F5E
    claim_text: Predicate binding hints must say that the schema does not fit the claim when the claim names no participant
    role: normative
    status: modeled
    span:
      start: 305
      end: 412
id: REQ-model-predicates-participant-not-subject
type: req
---
Predicate modeling must leave a participant argument unbound when its value equals a component identifier the requirement constrains. Predicate binding hints must offer the component identifiers the requirement constrains only for the argument that names what the claim is about and for entity arguments. Predicate binding hints must say that the schema does not fit the claim when the claim names no participant.

## Context

Round 9 of the onboarding evaluation on a test project modeled a claim that names no actor against permission_rule, and the binding hint listed the identifier the requirement constrains among the actor examples. That identifier names the component the requirement is about, which the planned predicate already carries; it is never a participant. For actor, actor_scope, role and owner arguments the hint must name the missing participant and point to record_ontology_gap when the schema does not fit, and an explicit actor binding equal to the constrained identifier must be rejected with that reason. Requested by the project owner after the evaluation report.

## Source

> Onboarding evaluation round 9, finding K19: buildBindingHints must not offer the requirement's constrained identifier as actor; offer it only for the argument that names what the claim is about and for entity-typed arguments; when the claim names no participant the hint says so and points to record_ontology_gap.