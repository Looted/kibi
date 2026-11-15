---
title: A must requirement written after schema 17 states its positive behaviour as a success scenario on its subjects
status: open
priority: must
required_evidence: tested
tags:
  - kb
  - domain-subjects
  - migration
semantic_text: Kibi must report a current must requirement recorded after the schema 17 upgrade without a success scenario that assumes a fact on its subjects as a must-positive-scenario violation.
semantic_inventory_version: kibi.semantic-inventory.v1
semantic_source_field: semantic_text
semantic_source_hash: 508152ccff66c02e3d92d9eddbf9f09bb17eb6dae51e0c98731d12a4f9d94217
semantic_inventory:
  - claim_key: CLAIM-A41229A36B98373E
    claim_text: Kibi must report a current must requirement recorded after the schema 17 upgrade without a success scenario that assumes a fact on its subjects as a must-positive-scenario violation
    role: normative
    status: modeled
    span:
      start: 0
      end: 181
    reason: Grounded by FACT-kb-must-positive-scenario-reported via requires_property.
logic_claims:
  - CLAIM-A41229A36B98373E
origin:
  kind: agent
  ref: Maintainer request to implement the domain subject proposal, layer 2 (positive scenarios), 2026-11-12
  approved_by: maintainer
  recorded_at: '2026-11-13T04:00:00.000Z'
id: REQ-kb-must-positive-scenario
type: req
---
Kibi must report a current must requirement recorded after the schema 17 upgrade without a success scenario that assumes a fact on its subjects as a must-positive-scenario violation.

## Context
Subject anchors (REQ-kb-domain-subject-layer) group requirements by subject, but a prose rule that never states what it allows gives scenario-feasibility nothing to refuse. In a test project, one rule said the read-only view locks the drawing and another said the review editor opens in that view; the second never said that the reviewer can draw there. A success scenario states that allowed behaviour as facts on the rule's subjects (a property value, predicate or rule fact; assuming the subject fact itself states nothing), and scenario-feasibility then refuses it when a rule in force forbids it, with no judgement from an agent. The maintainer chose to require this only of must requirements written after the schema 17 upgrade; the migration records the existing ones in the manifest instead of inventing scenarios for them. A requirement whose subjects no subject fact defines is told to define the subject first, since nothing can be assumed about an undefined subject.

## Source
> Ok, implement the proposal.

The maintainer, 2026-11-12, approving the three-layer proposal whose second layer reads: "A new must requirement needs at least one success scenario whose assumes use its anchored subjects."
