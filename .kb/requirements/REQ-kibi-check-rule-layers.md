---
title: Every check rule declares its layer, knowledge or verification
status: open
priority: must
tags:
  - check
  - rules
  - levels
semantic_text: Every check rule in the rule registry must declare its layer, knowledge or verification. The verification layer must hold exactly evidence-floor, symbol-coverage, must-priority-coverage, must-positive-scenario, proof-contract-claims and proof-contract-symbols.
origin:
  kind: agent
  approved_by: maintainer
  ref: 'Maintainer decision, 2026-11-25, splitting Kibi into a knowledge layer that is always on and a verification layer with levels: "the first layer is building the knowledge base and you ignore all the proof and quality. Then turning on proof is the second layer." Approving the Kibi level statements, statement 1 of 13: "Approve all as written".'
  recorded_at: '2026-11-25T08:31:06.189Z'
rationale: 'The maintainer wants Kibi to read as levels of how hard it pushes the agent: "the first layer is building the knowledge base and you ignore all the proof and quality. Then turning on proof is the second layer." Each rule names its layer so a level can choose its rules from the registry.'
semantic_inventory_version: kibi.semantic-inventory.v1
semantic_source_field: semantic_text
semantic_source_hash: efe9d4be2654c90ff57b24b4e762c3bbeba419dcef26abbc82094eb33360cd70
semantic_inventory:
  - claim_key: CLAIM-9A034281F0729991
    status: modeled
    subjects:
      - kibi.check.rule_selection
    reason: Grounded by FACT-PROP-kibi-check-rule-layers-count via requires_property.
    claim_text: Every check rule in the rule registry must declare its layer, knowledge or verification
    role: normative
    span:
      start: 0
      end: 87
  - claim_key: CLAIM-A4AB3FEAC7EB55A8
    status: modeled
    subjects:
      - kibi.check.rule_selection
    reason: Grounded by FACT-PROP-kibi-check-rule-layers-c02 via requires_property.
    claim_text: The verification layer must hold exactly evidence-floor, symbol-coverage, must-priority-coverage, must-positive-scenario, proof-contract-claims and proof-contract-symbols
    role: normative
    span:
      start: 89
      end: 259
logic_claims:
  - CLAIM-9A034281F0729991
  - CLAIM-A4AB3FEAC7EB55A8
id: REQ-kibi-check-rule-layers
type: req
required_evidence: tested
---
Every check rule in the rule registry must declare its layer, knowledge or verification. The verification layer must hold exactly evidence-floor, symbol-coverage, must-priority-coverage, must-positive-scenario, proof-contract-claims and proof-contract-symbols.

## Context

The maintainer wants Kibi to read as levels of how hard it pushes the agent: "the first layer is building the knowledge base and you ignore all the proof and quality. Then turning on proof is the second layer." Each rule names its layer so a level can choose its rules from the registry.

## Source

> Maintainer decision, 2026-11-25, splitting Kibi into a knowledge layer that is always on and a verification layer with levels: "the first layer is building the knowledge base and you ignore all the proof and quality. Then turning on proof is the second layer." Approving the Kibi level statements, statement 1 of 13: "Approve all as written".
