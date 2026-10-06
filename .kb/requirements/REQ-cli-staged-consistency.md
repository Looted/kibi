---
title: Staged check blocks consistency violations a commit introduces
status: open
priority: must
tags:
  - cli
  - check
  - staged
  - scenario-feasibility
  - contradictions
rationale: The pre-commit hook runs kibi check --staged, which only checked symbol traceability, so a commit could add a success scenario a current requirement forbids while full kibi check failed on the same tree.
semantic_text: The staged check must block a staged change that introduces a domain contradiction, an infeasible success scenario or an invalid exception claim key into the staged knowledge. The staged check must not block a staged change for a consistency violation that already exists at the base commit.
semantic_clauses:
  - The staged check must block a staged change that introduces a domain contradiction, an infeasible success scenario or an invalid exception claim key into the staged knowledge.
  - The staged check must not block a staged change for a consistency violation that already exists at the base commit.
semantic_inventory_version: kibi.semantic-inventory.v1
semantic_source_field: semantic_text
semantic_source_hash: 1d9af87ff5ef9c3b63f20a3937d348b8d5840b2168e423f54a344d4e1226b260
semantic_inventory:
  - claim_key: CLAIM-B9419D037ED77859
    claim_text: The staged check must block a staged change that introduces a domain contradiction, an infeasible success scenario or an invalid exception claim key into the staged knowledge
    role: normative
    status: modeled
    span:
      start: 0
      end: 174
  - claim_key: CLAIM-A303F373E6C1CCCD
    claim_text: The staged check must not block a staged change for a consistency violation that already exists at the base commit
    role: normative
    status: modeled
    span:
      start: 176
      end: 290
logic_claims:
  - CLAIM-B9419D037ED77859
  - CLAIM-A303F373E6C1CCCD
origin:
  kind: agent
  ref: 'Piotr thread 2026-10-06: kibi check --staged let an infeasible scenario commit through'
  recorded_at: '2026-10-06T18:18:39.297Z'
id: REQ-cli-staged-consistency
type: req
---
The staged check must block a staged change that introduces a domain contradiction, an infeasible success scenario or an invalid exception claim key into the staged knowledge. The staged check must not block a staged change for a consistency violation that already exists at the base commit.
