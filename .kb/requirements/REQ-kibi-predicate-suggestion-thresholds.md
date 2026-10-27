---
title: The predicate suggester uses an applicability threshold of 0.62 and a weak-candidate margin of 0.06
status: open
semantic_text: The applicability threshold shall be 0.62. The weak-candidate margin shall be 0.06.
semantic_source_field: semantic_text
origin:
  kind: agent
  ref: 'Maintainer decision, 2026-10-27, approving requirement rewrites and splits that let structural claims be proved: "Please work towards full proof."'
  approved_by: maintainer
  recorded_at: '2026-10-27T08:08:13.104Z'
firmness: firm
semantic_clauses:
  - The applicability threshold shall be 0.62.
  - The weak-candidate margin shall be 0.06.
priority: must
semantic_inventory_version: kibi.semantic-inventory.v1
semantic_source_hash: 4a30dda7bb827bbcc9bf2716224ddef3a06ad33515644494d5a68b103eae6b35
semantic_inventory:
  - claim_key: CLAIM-DF5F85EFF9599777
    claim_text: The applicability threshold shall be 0.62
    role: normative
    status: modeled
    span:
      start: 0
      end: 41
  - claim_key: CLAIM-85F4539DE7FF58E8
    claim_text: The weak-candidate margin shall be 0.06
    role: normative
    status: modeled
    span:
      start: 43
      end: 82
logic_claims:
  - CLAIM-DF5F85EFF9599777
  - CLAIM-85F4539DE7FF58E8
id: REQ-kibi-predicate-suggestion-thresholds
type: req
---
The applicability threshold shall be 0.62. The weak-candidate margin shall be 0.06.

## Context

The predicate suggester recommends a candidate only above the applicability threshold, and abstains when the two leading candidates are closer than the weak-candidate margin (REQ-kibi-predicate-suggestion-relevance-v1). Both numbers are exported constants of the applicability scorer, so each claim is proved against the value the code holds.
