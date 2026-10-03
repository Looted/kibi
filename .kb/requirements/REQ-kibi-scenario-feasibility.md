---
title: Scenarios that assume a forbidden value are reported infeasible and block proof
status: open
priority: must
tags:
  - scenarios
  - checks
  - requirement-proof
  - scenario-feasibility
semantic_text: The scenario-feasibility check must report a scenario that expects success and assumes a property value that a current requirement forbids. The proof ladder must block each requirement specified by an infeasible scenario with the infeasible_scenario gap. An approved exception requirement that exempts the base requirement and is specified by the scenario must make that scenario feasible. The scenario-feasibility check must not check scenarios that expect rejection or error.
semantic_clauses:
  - The scenario-feasibility check must report a scenario that expects success and assumes a property value that a current requirement forbids.
  - The proof ladder must block each requirement specified by an infeasible scenario with the infeasible_scenario gap.
  - An approved exception requirement that exempts the base requirement and is specified by the scenario must make that scenario feasible.
  - The scenario-feasibility check must not check scenarios that expect rejection or error.
semantic_inventory_version: kibi.semantic-inventory.v1
semantic_source_field: semantic_text
semantic_source_hash: b363b183e946c07c50441fb951e8df9fb15de1bc5c461f37b4e8d215a6b6be4c
semantic_inventory:
  - claim_key: CLAIM-2280D0882FBA7640
    claim_text: The scenario-feasibility check must report a scenario that expects success and assumes a property value that a current requirement forbids
    role: normative
    span:
      start: 0
      end: 138
    status: modeled
    reason: Grounded by a logical_requirement_rule predicate fact over the reviewed project-local logical_requirement_rule schema.
  - claim_key: CLAIM-F3AA29C7287E6870
    claim_text: The proof ladder must block each requirement specified by an infeasible scenario with the infeasible_scenario gap
    role: normative
    span:
      start: 140
      end: 253
    status: modeled
    reason: Grounded by a logical_requirement_rule predicate fact over the reviewed project-local logical_requirement_rule schema.
  - claim_key: CLAIM-22CF42DE40B266EA
    claim_text: An approved exception requirement that exempts the base requirement and is specified by the scenario must make that scenario feasible
    role: normative
    span:
      start: 255
      end: 388
    status: modeled
    reason: Grounded by a check_exemption_policy predicate fact over the reviewed project-local check_exemption_policy schema.
  - claim_key: CLAIM-90669BB32C299C4E
    claim_text: The scenario-feasibility check must not check scenarios that expect rejection or error
    role: normative
    span:
      start: 390
      end: 476
    status: modeled
    reason: Grounded by a check_exemption_policy predicate fact over the reviewed project-local check_exemption_policy schema.
logic_claims:
  - CLAIM-2280D0882FBA7640
  - CLAIM-F3AA29C7287E6870
  - CLAIM-22CF42DE40B266EA
  - CLAIM-90669BB32C299C4E
id: REQ-kibi-scenario-feasibility
type: req
---
The scenario-feasibility check must report a scenario that expects success and assumes a property value that a current requirement forbids. The proof ladder must block each requirement specified by an infeasible scenario with the infeasible_scenario gap. An approved exception requirement that exempts the base requirement and is specified by the scenario must make that scenario feasible. The scenario-feasibility check must not check scenarios that expect rejection or error.
