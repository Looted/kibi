---
title: Vocabulary alignment threshold and scope
status: open
priority: must
firmness: firm
semantic_text: The built-in claim similarity threshold shall be 0.75. An external vocabulary alignment provider shall run only for kb_model_requirement.
semantic_clauses:
  - The built-in claim similarity threshold shall be 0.75.
  - An external vocabulary alignment provider shall run only for kb_model_requirement.
tags:
  - proof
origin:
  kind: agent
  ref: 'Maintainer decision, 2026-10-28, to keep splitting structural claims so more requirements are proved: "Please continue prooving what we can, I want to get as high as possible."'
  approved_by: maintainer
  recorded_at: '2026-10-28T15:05:43.387Z'
semantic_inventory_version: kibi.semantic-inventory.v1
semantic_source_field: semantic_text
semantic_source_hash: e1acaca26be60ebf15e5dd8525f80540da781ec64f99c37c82a92246d5f4b219
semantic_inventory:
  - claim_key: CLAIM-50F8B11033E58CB8
    claim_text: The built-in claim similarity threshold shall be 0.75
    role: normative
    status: modeled
    span:
      start: 0
      end: 53
  - claim_key: CLAIM-F71286DA6318994F
    claim_text: An external vocabulary alignment provider shall run only for kb_model_requirement
    role: normative
    status: modeled
    span:
      start: 55
      end: 136
logic_claims:
  - CLAIM-50F8B11033E58CB8
  - CLAIM-F71286DA6318994F
id: REQ-kibi-vocabulary-alignment-settings
type: req
---
The built-in claim similarity threshold shall be 0.75. An external vocabulary alignment provider shall run only for kb_model_requirement.

## Context

The built-in vocabulary alignment reuses an existing claim only above its similarity threshold, and an external provider may run only for the operations on its allowlist (REQ-kibi-vocabulary-alignment-capability). Each value is stated here so it is proved against its constant.

## Source

Maintainer decision, 2026-10-28, to keep splitting structural claims so more requirements are proved: "Please continue prooving what we can, I want to get as high as possible."
