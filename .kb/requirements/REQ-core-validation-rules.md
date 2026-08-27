---
id: REQ-core-validation-rules
title: Core integrity and coverage validation rules
status: open
created_at: 2026-05-13T10:00:00.000Z
updated_at: 2026-05-13T10:00:00.000Z
source: REQ-006
priority: must
tags:
  - core
  - validation
links:
  - type: supersedes
    target: REQ-006
  - type: specified_by
    target: SCEN-001
semantic_text: Validation rules. The Prolog KB core implements a must-priority-coverage validation rule ensuring requirements with must priority have at least one scenario and one test. The Prolog KB core implements a no-dangling-refs validation rule ensuring all relationship targets exist as entities in the KB. The Prolog KB core implements a no-cycles validation rule preventing circular dependency chains in requirements and ADRs.
semantic_clauses:
  - The Prolog KB core implements a must-priority-coverage validation rule ensuring requirements with must priority have at least one scenario and one test
  - The Prolog KB core implements a no-dangling-refs validation rule ensuring all relationship targets exist as entities in the KB
  - The Prolog KB core implements a no-cycles validation rule preventing circular dependency chains in requirements and ADRs
semantic_inventory:
  - claim_key: CLAIM-2B265248D95171BD
    claim_text: The Prolog KB core implements a must-priority-coverage validation rule ensuring requirements with must priority have at least one scenario and one test
    role: normative
    status: modeled
    span:
      start: 18
      end: 169
    payload_hash: 6b3e310882401d5d094595195914764e89064d34c3eaa8adbfd67c774c8ac899
    reason: Grounded by FACT-core-validation-rules-5171BD via requires_predicate.
  - claim_key: CLAIM-6189F8978EDF093D
    claim_text: The Prolog KB core implements a no-dangling-refs validation rule ensuring all relationship targets exist as entities in the KB
    role: descriptive
    status: modeled
    span:
      start: 171
      end: 297
    payload_hash: 6b3e310882401d5d094595195914764e89064d34c3eaa8adbfd67c774c8ac899
    reason: Grounded by FACT-core-validation-rules-DF093D via requires_predicate.
  - claim_key: CLAIM-ECBEC0BAECCA4929
    claim_text: The Prolog KB core implements a no-cycles validation rule preventing circular dependency chains in requirements and ADRs
    role: descriptive
    status: modeled
    span:
      start: 299
      end: 419
    payload_hash: 6b3e310882401d5d094595195914764e89064d34c3eaa8adbfd67c774c8ac899
    reason: Grounded by FACT-core-validation-rules-CA4929 via requires_predicate.
semantic_inventory_version: kibi.semantic-inventory.v1
semantic_source_field: semantic_text
semantic_source_hash: 3aa5519df701e1c4e14fa6a2cbe7b85dcaeab159813aaf4ecbd345badd15aaab
logic_claims:
  - CLAIM-2B265248D95171BD
  - CLAIM-6189F8978EDF093D
  - CLAIM-ECBEC0BAECCA4929
type: req
---

The Prolog KB core implements foundational validation rules to ensure data consistency:
- `must-priority-coverage`: ensures requirements with "must" priority have at least one scenario and one test.
- `no-dangling-refs`: ensures all relationship targets exist as entities in the KB.
- `no-cycles`: prevents circular dependency chains in requirements and ADRs.
