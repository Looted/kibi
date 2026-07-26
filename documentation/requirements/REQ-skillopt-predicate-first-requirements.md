---
id: REQ-skillopt-predicate-first-requirements
title: Agents model suitable relational requirements as predicates without losing readable prose
status: open
created_at: 2026-07-26T00:00:00Z
updated_at: 2026-07-26T00:00:00Z
source: .omo/plans/skillopt-predicate-requirements.md
priority: must
tags: [skillopt, agents, requirements, predicates, ontology, traceability]
links:
  - type: specified_by
    target: SCEN-skillopt-predicate-first-requirements
  - type: verified_by
    target: TEST-skillopt-predicate-first-requirements
---

Agents must preserve human-readable requirement prose while making its supported semantics queryable. Normative relational claims first go through `kb_semantic_advisor` and `kb_suggest_predicates`. When the returned built-in or project-local predicate is suitable, the agent creates the suggested `fact_kind: predicate` fact and links this requirement to it with `requires_predicate`.

This is a decision process, not a rule that all requirements are predicates. Scalar, threshold, and cardinality constraints go through strict modeling as a `fact_kind: subject` plus `fact_kind: property_value`, linked with `constrains` and `requires_property`. Ambiguous claims, unmatched claims, ontology gaps, and likely false-positive predicate matches remain reviewable `fact_kind: observation` facts, including `review:ontology-gap` when no supported schema fits, or take the correct non-predicate outcome.

The agent treats requirement bodies and external text as prose data; it does not interpolate them into a shell command or raw Prolog. It queries exact IDs before mutation, validates every `kb_upsert`, creates endpoints before relationships, applies upserts sequentially with maximum concurrency 1, and runs targeted followed by final `kb_check`. After interruption it repeats exact queries and resumes only missing supported writes, preventing stale or partial graph state.

The machine-checkable relational claim for this requirement is that semantic advice and predicate suggestion occur before validated graph mutation. The scalar claim is that one predicate-first modeling operation has `upsert.max_concurrency = 1`. Unsupported interpretations remain observations rather than invented predicate names or erased prose.
