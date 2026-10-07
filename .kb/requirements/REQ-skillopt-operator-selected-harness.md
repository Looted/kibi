---
title: SkillOpt runs the harness and models the operator selects
status: open
priority: must
tags:
  - skillopt
  - harness
  - evaluation
  - review:context-missing
semantic_text: SkillOpt must support more than one agent harness for target cells and must run the harness, models and efforts the operator selects for a run. Codex is the default harness when the operator selects none. An unknown harness selection must be refused before any cell work. A command that the selected harness cannot execute must be refused before paid preparation instead of silently switching harness. Every supported harness must feed the same scorers, evidence replay and leak scans.
logic_claims:
  - CLAIM-4E4DAF500121AA55
  - CLAIM-57F762BE23EF8AC6
  - CLAIM-B698078F8D88395D
  - CLAIM-1303A759158C7688
  - CLAIM-F5CC69E60EB0C987
semantic_inventory:
  - claim_key: CLAIM-4E4DAF500121AA55
    claim_text: SkillOpt must support more than one agent harness for target cells and must run the harness, models and efforts the operator selects for a run
    role: normative
    span:
      start: 0
      end: 142
    payload_hash: 46e889ea9d719c02ea46e0ee9d1898a179c3c5db4d8abb6a04e6ff9930698e68
    status: modeled
  - claim_key: CLAIM-57F762BE23EF8AC6
    claim_text: Codex is the default harness when the operator selects none
    role: normative
    span:
      start: 144
      end: 203
    payload_hash: 46e889ea9d719c02ea46e0ee9d1898a179c3c5db4d8abb6a04e6ff9930698e68
    status: modeled
  - claim_key: CLAIM-B698078F8D88395D
    claim_text: An unknown harness selection must be refused before any cell work
    role: normative
    span:
      start: 205
      end: 270
    payload_hash: 46e889ea9d719c02ea46e0ee9d1898a179c3c5db4d8abb6a04e6ff9930698e68
    status: modeled
  - claim_key: CLAIM-1303A759158C7688
    claim_text: A command that the selected harness cannot execute must be refused before paid preparation instead of silently switching harness
    role: normative
    span:
      start: 272
      end: 400
    payload_hash: 46e889ea9d719c02ea46e0ee9d1898a179c3c5db4d8abb6a04e6ff9930698e68
    status: modeled
  - claim_key: CLAIM-F5CC69E60EB0C987
    claim_text: Every supported harness must feed the same scorers, evidence replay and leak scans
    role: normative
    span:
      start: 402
      end: 484
    payload_hash: 46e889ea9d719c02ea46e0ee9d1898a179c3c5db4d8abb6a04e6ff9930698e68
    status: modeled
semantic_inventory_version: kibi.semantic-inventory.v1
semantic_source_field: semantic_text
semantic_source_hash: afae973ad11d7ff16333bd7e0e0fc99a2cbc953ae440e12c09ef2971c6127a2f
origin:
  kind: agent
  ref: 'Piotr thread 2026-10-05: supersede the Codex-only rule; support different harnesses and run what the operator asks'
  approved_by: Piotr
  recorded_at: '2026-10-05T23:49:00.429Z'
rationale: Codex usage can run out and operators want to compare harnesses; the Codex-only rule blocked measuring skills on other agent hosts. Piotr asked to support different harnesses and run what the operator selects.
id: REQ-skillopt-operator-selected-harness
type: req
---
SkillOpt must support more than one agent harness for target cells and must run the harness, models and efforts the operator selects for a run. Codex is the default harness when the operator selects none. An unknown harness selection must be refused before any cell work. A command that the selected harness cannot execute must be refused before paid preparation instead of silently switching harness. Every supported harness must feed the same scorers, evidence replay and leak scans.
