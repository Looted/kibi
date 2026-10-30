---
title: Built-in predicate rule confidence
status: open
priority: must
firmness: firm
semantic_text: A built-in predicate rule match shall have confidence 0.84.
semantic_clauses:
  - A built-in predicate rule match shall have confidence 0.84.
tags:
  - proof
origin:
  kind: agent
  ref: 'Maintainer decision, 2026-10-27, approving requirement rewrites and splits that let structural claims be proved: "Please work towards full proof." Restated 2026-10-28: "Can we do more than 7? Kibi doesn''t have a UI, so it should be possible to proove more?"'
  approved_by: maintainer
  recorded_at: '2026-10-29T17:00:17.559Z'
semantic_inventory_version: kibi.semantic-inventory.v1
semantic_source_field: semantic_text
semantic_source_hash: 09bdfe821d76c7976630f437162106492b98777ef7e06a1128f066ba1c324fd8
semantic_inventory:
  - claim_key: CLAIM-A645E9005AAD5364
    claim_text: A built-in predicate rule match shall have confidence 0.84
    role: normative
    status: modeled
    span:
      start: 0
      end: 58
logic_claims:
  - CLAIM-A645E9005AAD5364
id: REQ-capability-builtin-predicate-confidence
type: req
---
A built-in predicate rule match shall have confidence 0.84.

## Context

packages/plugin-builtin/src/ontology/predicate-rule.ts scores the predicate matches the built-in plugin of REQ-capability-plugin-builtin-parity-v1 reports. The score is stated here so it is proved against the constant.

## Source

Maintainer decision, 2026-10-27, approving requirement rewrites and splits that let structural claims be proved: "Please work towards full proof." Restated 2026-10-28: "Can we do more than 7? Kibi doesn't have a UI, so it should be possible to proove more?"