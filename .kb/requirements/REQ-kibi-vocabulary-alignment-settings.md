---
title: Vocabulary alignment thresholds and scope
status: open
priority: must
firmness: firm
semantic_text: The built-in subject reuse threshold shall be 0.4. The built-in claim similarity threshold shall be 0.75. The Jev vocabulary alignment shall rank at most 5 subject candidates. The vocabulary alignment choice that keeps a new subject shall be new_subject. An external vocabulary alignment provider shall run only for kb_model_requirement.
semantic_clauses:
  - The built-in subject reuse threshold shall be 0.4.
  - The built-in claim similarity threshold shall be 0.75.
  - The Jev vocabulary alignment shall rank at most 5 subject candidates.
  - The vocabulary alignment choice that keeps a new subject shall be new_subject.
  - An external vocabulary alignment provider shall run only for kb_model_requirement.
tags:
  - proof
origin:
  kind: agent
  ref: 'Maintainer decision, 2026-10-27, approving requirement rewrites and splits that let structural claims be proved: "Please work towards full proof." Restated 2026-10-28: "Can we do more than 7? Kibi doesn''t have a UI, so it should be possible to proove more?"'
  approved_by: maintainer
  recorded_at: '2026-10-28T10:44:42.477Z'
semantic_inventory_version: kibi.semantic-inventory.v1
semantic_source_field: semantic_text
semantic_source_hash: 4ad7e939143ebf849824b3938f166a8a2ee52c68bd854ff29fc6d631483d2309
semantic_inventory:
  - claim_key: CLAIM-85B992FBBF4D1D1D
    claim_text: The built-in subject reuse threshold shall be 0.4
    role: normative
    status: modeled
    span:
      start: 0
      end: 49
  - claim_key: CLAIM-50F8B11033E58CB8
    claim_text: The built-in claim similarity threshold shall be 0.75
    role: normative
    status: modeled
    span:
      start: 51
      end: 104
  - claim_key: CLAIM-C2B6CB8DA753C27B
    claim_text: The Jev vocabulary alignment shall rank at most 5 subject candidates
    role: normative
    status: modeled
    span:
      start: 106
      end: 174
  - claim_key: CLAIM-7F4D272E71DE484E
    claim_text: The vocabulary alignment choice that keeps a new subject shall be new_subject
    role: normative
    status: modeled
    span:
      start: 176
      end: 253
  - claim_key: CLAIM-F71286DA6318994F
    claim_text: An external vocabulary alignment provider shall run only for kb_model_requirement
    role: normative
    status: modeled
    span:
      start: 255
      end: 336
logic_claims:
  - CLAIM-85B992FBBF4D1D1D
  - CLAIM-50F8B11033E58CB8
  - CLAIM-C2B6CB8DA753C27B
  - CLAIM-7F4D272E71DE484E
  - CLAIM-F71286DA6318994F
id: REQ-kibi-vocabulary-alignment-settings
type: req
---
The built-in subject reuse threshold shall be 0.4. The built-in claim similarity threshold shall be 0.75. The Jev vocabulary alignment shall rank at most 5 subject candidates. The vocabulary alignment choice that keeps a new subject shall be new_subject. An external vocabulary alignment provider shall run only for kb_model_requirement.

## Context

The built-in vocabulary alignment reuses a subject or a claim only above its thresholds, the Jev provider ranks a fixed number of subject candidates, an agent picks the new_subject choice to keep a new subject, and an external provider may run only for the operations on its allowlist (REQ-kibi-vocabulary-alignment-capability). Each value is stated here so it is proved against its constant.

## Source

Maintainer decision, 2026-10-27, approving requirement rewrites and splits that let structural claims be proved: "Please work towards full proof." Restated 2026-10-28: "Can we do more than 7? Kibi doesn't have a UI, so it should be possible to proove more?"