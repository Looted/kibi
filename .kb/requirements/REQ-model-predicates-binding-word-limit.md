---
title: Predicate modeling binds participant names of at most three words
status: open
priority: must
firmness: firm
semantic_text: The maximum bound participant name length shall be 3 words.
semantic_clauses:
  - The maximum bound participant name length shall be 3 words.
tags:
  - proof
origin:
  kind: agent
  ref: 'Maintainer decision, 2026-10-27, approving requirement rewrites and splits that let structural claims be proved: "Please work towards full proof." Restated 2026-10-28: "Can we do more than 7? Kibi doesn''t have a UI, so it should be possible to proove more?"'
  approved_by: maintainer
  recorded_at: '2026-10-28T10:14:09.705Z'
semantic_inventory_version: kibi.semantic-inventory.v1
semantic_source_field: semantic_text
semantic_source_hash: 1fb89452055a7d0dfb9fdb2e4d57b392fbd168924ce6e0d670641eded938c946
semantic_inventory:
  - claim_key: CLAIM-0177F086CAF82496
    claim_text: The maximum bound participant name length shall be 3 words
    role: normative
    status: modeled
    span:
      start: 0
      end: 58
logic_claims:
  - CLAIM-0177F086CAF82496
id: REQ-model-predicates-binding-word-limit
type: req
---
The maximum bound participant name length shall be 3 words.

## Context

MAX_NAMING_BINDING_WORDS in packages/cli/src/operations/modeling/predicate-bindings.ts is the word limit REQ-model-predicates-binding-clauses applies: a participant value with more words is a clause and stays unbound. This requirement states the limit as a number so it is proved against the constant.

## Source

Maintainer decision, 2026-10-27, approving requirement rewrites and splits that let structural claims be proved: "Please work towards full proof." Restated 2026-10-28: "Can we do more than 7? Kibi doesn't have a UI, so it should be possible to proove more?"