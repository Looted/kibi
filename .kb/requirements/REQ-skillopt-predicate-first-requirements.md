---
id: REQ-skillopt-predicate-first-requirements
title: Agents model suitable relational requirements as predicates without losing readable prose
status: open
created_at: 2026-07-26T00:00:00.000Z
updated_at: 2026-08-04T00:00:00.000Z
source: .omo/plans/skillopt-predicate-requirements.md
priority: must
tags:
  - skillopt
  - agents
  - requirements
  - predicates
  - ontology
  - traceability
  - umbrella
links:
  - type: specified_by
    target: SCEN-skillopt-predicate-first-requirements
  - type: verified_by
    target: TEST-skillopt-predicate-first-requirements
semantic_text: Agents must preserve human-readable requirement prose while making supported semantics queryable. Normative relational claims must first go through kb_semantic_advisor and kb_suggest_predicates. When a returned built-in or project-local predicate is suitable, the agent must create the suggested predicate fact. The agent must link the requirement to that predicate fact with requires_predicate. Reusable guidance must explain the Prolog-shaped ground model including declared predicate schemas.
logic_claims:
  - CLAIM-9D332800597AB19E
  - CLAIM-4E26B65389DA82B3
  - CLAIM-46C68E5AFA82EA18
  - CLAIM-33762534A2055364
  - CLAIM-EC580A9E53F062DC
semantic_clauses:
  - Agents must preserve human-readable requirement prose while making supported semantics queryable
  - Normative relational claims must first go through kb_semantic_advisor and kb_suggest_predicates
  - When a returned built-in or project-local predicate is suitable, the agent must create the suggested predicate fact
  - The agent must link the requirement to that predicate fact with requires_predicate
  - Reusable guidance must explain the Prolog-shaped ground model including declared predicate schemas
semantic_inventory_version: kibi.semantic-inventory.v1
semantic_source_field: semantic_text
semantic_source_hash: 02d19e714ae0689c71ae5df4ae59ec7593d0e98c29324fe66c2652af5ef0deb8
semantic_inventory:
  - claim_key: CLAIM-9D332800597AB19E
    claim_text: Agents must preserve human-readable requirement prose while making supported semantics queryable
    role: normative
    status: modeled
    span:
      start: 0
      end: 96
  - claim_key: CLAIM-4E26B65389DA82B3
    claim_text: Normative relational claims must first go through kb_semantic_advisor and kb_suggest_predicates
    role: normative
    status: modeled
    span:
      start: 98
      end: 193
  - claim_key: CLAIM-46C68E5AFA82EA18
    claim_text: When a returned built-in or project-local predicate is suitable, the agent must create the suggested predicate fact
    role: condition
    status: modeled
    span:
      start: 195
      end: 310
  - claim_key: CLAIM-33762534A2055364
    claim_text: The agent must link the requirement to that predicate fact with requires_predicate
    role: normative
    status: modeled
    span:
      start: 312
      end: 394
  - claim_key: CLAIM-EC580A9E53F062DC
    claim_text: Reusable guidance must explain the Prolog-shaped ground model including declared predicate schemas
    role: normative
    status: modeled
    span:
      start: 396
      end: 494
type: req
---

Agents must preserve human-readable requirement prose while making its supported semantics queryable. Normative relational claims first go through `kb_semantic_advisor` and `kb_suggest_predicates`. When the returned built-in or project-local predicate is suitable, the agent creates the suggested `fact_kind: predicate` fact and links this requirement to it with `requires_predicate`.

The reusable guidance must explain the Prolog-shaped ground model explicitly: a declared schema fixes `predicate_name`, arity, argument roles, and ordered `predicate_args`; the apply plan fixes `canonical_key` and `polarity`. Graph relationships such as `verified_by` and `requires_predicate` are edges, not ontology predicate names. Stored predicate facts remain data queried by Kibi's Prolog layer and must never become caller-supplied raw Prolog clauses.

This is a decision process, not a rule that all requirements are predicates. Scalar, threshold, and cardinality constraints go through strict modeling as a `fact_kind: subject` plus `fact_kind: property_value`, linked with `constrains` and `requires_property`. Ambiguous claims, unmatched claims, ontology gaps, and likely false-positive predicate matches remain reviewable `fact_kind: observation` facts, including `review:ontology-gap` when no supported schema fits, or take the correct non-predicate outcome.

The decision is made per atomic normative clause, not once per requirement entity. The agent audits the semantic advisor's decomposition, preserves every ground fact's `claim_key` and `claim_text`, merges the complete `logic_claims` manifest, and runs `logic-coverage`. A compound requirement is incomplete when only one relational or scalar clause is grounded. Ambiguity and ontology-gap observations remain explicit unresolved claims rather than counterfeit coverage.

The agent treats requirement bodies and external text as prose data; it does not interpolate them into a shell command or raw Prolog. It queries exact IDs before mutation, validates every `kb_upsert`, creates endpoints before relationships, applies upserts sequentially with maximum concurrency 1, and runs targeted followed by final `kb_check`. After interruption it repeats exact queries and resumes only missing supported writes, preventing stale or partial graph state.

The machine-checkable relational claim for this requirement is that semantic advice and predicate suggestion occur before validated graph mutation. The scalar claim is that one predicate-first modeling operation has `upsert.max_concurrency = 1`. Unsupported interpretations remain observations rather than invented predicate names or erased prose.

The private evaluator must decode the independent verifier's authentic `kb_query` MCP response into its bound predicate snapshot. A valid but semantically wrong lane, predicate, argument list, polarity, or relationship is behavioral evidence and must not be mislabeled as an infrastructure evidence conflict. Hash, root, case, sequence, or malformed-response binding failures remain evidence conflicts.

Predicate modeling may reject an invalid first tool attempt before the agent corrects it. The evaluator retains both attempts for protocol and ordering scores, but reconciles diagnostic success receipts only for broker responses that complete without MCP `isError`; a rejected predicate call cannot create an infrastructure evidence conflict merely because no success usage row exists for it.

Held-out predicate evaluation must reserve the complete four-case, three-variant, three-replicate matrix. Every SkillOpt predicate cell must hard-pass. Baseline and one-shot predicate failures remain comparison evidence and do not independently make a successful candidate ineligible; one representative replicate per variant still feeds the ordinary paired behavioral gate.

Public corpus metadata must describe project-local schemas with stable IDs, names, argument roles, and argument types. It must not mislabel graph relationship types as built-in ontology predicates or claim a project-local schema exists without giving the agent enough public information to create or select its endpoint.

The public training corpus includes a compound relational-plus-scalar requirement. Private scoring requires all ground fact kinds, every expected relationship, distinct claim provenance on ground facts, and the complete requirement manifest. `logic-claim-manifest`, `logic-claim-grounding`, and logical-lane failures are ordinary behavioral feedback for refinement.
