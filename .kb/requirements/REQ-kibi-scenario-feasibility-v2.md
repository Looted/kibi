---
title: Scenarios that assume what current requirements forbid, through property values or rules, are reported infeasible and block proof
status: open
priority: must
tags:
  - scenarios
  - checks
  - requirement-proof
  - scenario-feasibility
  - rules
  - validity
  - exceptions
semantic_text: The scenario-feasibility check must report a scenario that expects success and assumes a property value that a current requirement forbids. The scenario-feasibility check must report a scenario that expects success when its assumed property values cannot hold together under the constraints of current requirements. A current requirement's requires_rule rule that reads subject properties must constrain scenario assumptions in the same way as a requires_property fact. A requirement rule must restrict only scenarios that perform its action. A requirement constraint must govern a scenario only inside the validity window of its grounding fact. The scenario-feasibility check must report not_applicable when no current requirement governs any assumption of the scenario. A scenario whose feasibility cannot be decided must be reported by the scenario-feasibility-unknown advisory and never as feasible. The proof ladder must block each requirement specified by an infeasible scenario with the infeasible_scenario gap. An approved exception requirement that exempts the base requirement and is specified by the scenario must waive the base requirement's constraints for that scenario, or only the constraints grounded by its exempts_claims claim keys when it lists any. kb_check must report an exception whose exempts_claims names a claim key that is not a claim of a requirement it exempts as a blocking violation. The scenario-feasibility check must not check scenarios that expect rejection or error.
semantic_clauses:
  - The scenario-feasibility check must report a scenario that expects success and assumes a property value that a current requirement forbids.
  - The scenario-feasibility check must report a scenario that expects success when its assumed property values cannot hold together under the constraints of current requirements.
  - A current requirement's requires_rule rule that reads subject properties must constrain scenario assumptions in the same way as a requires_property fact.
  - A requirement rule must restrict only scenarios that perform its action.
  - A requirement constraint must govern a scenario only inside the validity window of its grounding fact.
  - The scenario-feasibility check must report not_applicable when no current requirement governs any assumption of the scenario.
  - A scenario whose feasibility cannot be decided must be reported by the scenario-feasibility-unknown advisory and never as feasible.
  - The proof ladder must block each requirement specified by an infeasible scenario with the infeasible_scenario gap.
  - An approved exception requirement that exempts the base requirement and is specified by the scenario must waive the base requirement's constraints for that scenario, or only the constraints grounded by its exempts_claims claim keys when it lists any.
  - kb_check must report an exception whose exempts_claims names a claim key that is not a claim of a requirement it exempts as a blocking violation.
  - The scenario-feasibility check must not check scenarios that expect rejection or error.
semantic_inventory_version: kibi.semantic-inventory.v1
semantic_source_field: semantic_text
semantic_source_hash: 8caed0eb83aa3d9eaed5979597671fd443bc64e4aa5f5152dab658e4d35d8260
semantic_inventory:
  - claim_key: CLAIM-2280D0882FBA7640
    claim_text: The scenario-feasibility check must report a scenario that expects success and assumes a property value that a current requirement forbids
    role: normative
    span:
      start: 0
      end: 138
    status: modeled
    reason: Grounded by the same fact that grounded this clause in the superseded requirement.
  - claim_key: CLAIM-227020406FD59323
    claim_text: The scenario-feasibility check must report a scenario that expects success when its assumed property values cannot hold together under the constraints of current requirements
    role: normative
    span:
      start: 140
      end: 314
    status: modeled
    reason: Grounded by a logical_requirement_rule predicate fact over the reviewed project-local logical_requirement_rule schema.
  - claim_key: CLAIM-E74AB859D3B39C5E
    claim_text: A current requirement's requires_rule rule that reads subject properties must constrain scenario assumptions in the same way as a requires_property fact
    role: normative
    span:
      start: 316
      end: 468
    status: modeled
    reason: Grounded by a logical_requirement_rule predicate fact over the reviewed project-local logical_requirement_rule schema.
  - claim_key: CLAIM-01F1BA2E11CCCA8F
    claim_text: A requirement rule must restrict only scenarios that perform its action
    role: normative
    span:
      start: 470
      end: 541
    status: modeled
    reason: Grounded by a logical_requirement_rule predicate fact over the reviewed project-local logical_requirement_rule schema.
  - claim_key: CLAIM-E1400EB179297A67
    claim_text: A requirement constraint must govern a scenario only inside the validity window of its grounding fact
    role: normative
    span:
      start: 543
      end: 644
    status: modeled
    reason: Grounded by a logical_requirement_rule predicate fact over the reviewed project-local logical_requirement_rule schema.
  - claim_key: CLAIM-3234B12EC561F775
    claim_text: The scenario-feasibility check must report not_applicable when no current requirement governs any assumption of the scenario
    role: normative
    span:
      start: 646
      end: 770
    status: modeled
    reason: Grounded by a logical_requirement_rule predicate fact over the reviewed project-local logical_requirement_rule schema.
  - claim_key: CLAIM-9C8092DF8303EDA4
    claim_text: A scenario whose feasibility cannot be decided must be reported by the scenario-feasibility-unknown advisory and never as feasible
    role: normative
    span:
      start: 772
      end: 902
    status: modeled
    reason: Grounded by a check_finding_policy fact reviewed against the current code.
  - claim_key: CLAIM-F3AA29C7287E6870
    claim_text: The proof ladder must block each requirement specified by an infeasible scenario with the infeasible_scenario gap
    role: normative
    span:
      start: 904
      end: 1017
    status: modeled
    reason: Grounded by the same fact that grounded this clause in the superseded requirement.
  - claim_key: CLAIM-95AEF38729509150
    claim_text: An approved exception requirement that exempts the base requirement and is specified by the scenario must waive the base requirement's constraints for that scenario, or only the constraints grounded by its exempts_claims claim keys when it lists any
    role: normative
    span:
      start: 1019
      end: 1268
    status: modeled
    reason: Grounded by a check_exemption_policy fact reviewed against the current code.
  - claim_key: CLAIM-69F3C5FF37A62A1E
    claim_text: kb_check must report an exception whose exempts_claims names a claim key that is not a claim of a requirement it exempts as a blocking violation
    role: normative
    span:
      start: 1270
      end: 1414
    status: modeled
    reason: Grounded by a check_finding_policy fact reviewed against the current code.
  - claim_key: CLAIM-90669BB32C299C4E
    claim_text: The scenario-feasibility check must not check scenarios that expect rejection or error
    role: normative
    span:
      start: 1416
      end: 1502
    status: modeled
    reason: Grounded by the same fact that grounded this clause in the superseded requirement.
logic_claims:
  - CLAIM-2280D0882FBA7640
  - CLAIM-227020406FD59323
  - CLAIM-E74AB859D3B39C5E
  - CLAIM-01F1BA2E11CCCA8F
  - CLAIM-E1400EB179297A67
  - CLAIM-3234B12EC561F775
  - CLAIM-9C8092DF8303EDA4
  - CLAIM-F3AA29C7287E6870
  - CLAIM-95AEF38729509150
  - CLAIM-69F3C5FF37A62A1E
  - CLAIM-90669BB32C299C4E
origin:
  kind: agent
  recorded_at: '2026-10-04T02:28:27.801Z'
id: REQ-kibi-scenario-feasibility-v2
type: req
---
The scenario-feasibility check must report a scenario that expects success and assumes a property value that a current requirement forbids. The scenario-feasibility check must report a scenario that expects success when its assumed property values cannot hold together under the constraints of current requirements. A current requirement's requires_rule rule that reads subject properties must constrain scenario assumptions in the same way as a requires_property fact. A requirement rule must restrict only scenarios that perform its action. A requirement constraint must govern a scenario only inside the validity window of its grounding fact. The scenario-feasibility check must report not_applicable when no current requirement governs any assumption of the scenario. A scenario whose feasibility cannot be decided must be reported by the scenario-feasibility-unknown advisory and never as feasible. The proof ladder must block each requirement specified by an infeasible scenario with the infeasible_scenario gap. An approved exception requirement that exempts the base requirement and is specified by the scenario must waive the base requirement's constraints for that scenario, or only the constraints grounded by its exempts_claims claim keys when it lists any. kb_check must report an exception whose exempts_claims names a claim key that is not a claim of a requirement it exempts as a blocking violation. The scenario-feasibility check must not check scenarios that expect rejection or error.

## Rationale

Conditional requirements ("checkout may happen only when the cart total is positive") now take part in feasibility checks exactly like property requirements, a requirement governs only scenarios in its scope and inside the validity window of its facts, and an approved exception can waive a single clause instead of the whole requirement (changeset `conditional-requirements`). The superseded requirement said an approved exception makes the scenario feasible, which no longer holds when the exception lists `exempts_claims`; its other clauses carry over unchanged.
