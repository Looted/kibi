---
title: Search answer size limits
status: open
priority: must
firmness: firm
semantic_text: A search answer shall be at most 16384 bytes. A search answer shall load at most 70 entity rows. A search answer shall list at most 5 governing requirements. A search answer shall list at most 8 linked facts per governing requirement. A search answer shall keep at most 280 characters of an ADR decision excerpt.
semantic_clauses:
  - A search answer shall be at most 16384 bytes.
  - A search answer shall load at most 70 entity rows.
  - A search answer shall list at most 5 governing requirements.
  - A search answer shall list at most 8 linked facts per governing requirement.
  - A search answer shall keep at most 280 characters of an ADR decision excerpt.
tags:
  - proof
origin:
  kind: agent
  ref: 'Maintainer decision, 2026-10-27, approving requirement rewrites and splits that let structural claims be proved: "Please work towards full proof." Restated 2026-10-28: "Can we do more than 7? Kibi doesn''t have a UI, so it should be possible to proove more?"'
  approved_by: maintainer
  recorded_at: '2026-10-28T11:10:10.309Z'
semantic_inventory_version: kibi.semantic-inventory.v1
semantic_source_field: semantic_text
semantic_source_hash: 52357940944a461db7d1f4e868ad6a69293da536ed7fb472121af2d3804e8ab2
semantic_inventory:
  - claim_key: CLAIM-46AE98A8124BBE18
    claim_text: A search answer shall be at most 16384 bytes
    role: normative
    status: modeled
    span:
      start: 0
      end: 44
  - claim_key: CLAIM-10E8E19FE532570B
    claim_text: A search answer shall load at most 70 entity rows
    role: normative
    status: modeled
    span:
      start: 46
      end: 95
  - claim_key: CLAIM-63645A08C98064C3
    claim_text: A search answer shall list at most 5 governing requirements
    role: normative
    status: modeled
    span:
      start: 97
      end: 156
  - claim_key: CLAIM-197E0C9A37307398
    claim_text: A search answer shall list at most 8 linked facts per governing requirement
    role: normative
    status: modeled
    span:
      start: 158
      end: 233
  - claim_key: CLAIM-779D56CBE5452DFC
    claim_text: A search answer shall keep at most 280 characters of an ADR decision excerpt
    role: normative
    status: modeled
    span:
      start: 235
      end: 311
logic_claims:
  - CLAIM-46AE98A8124BBE18
  - CLAIM-10E8E19FE532570B
  - CLAIM-63645A08C98064C3
  - CLAIM-197E0C9A37307398
  - CLAIM-779D56CBE5452DFC
id: REQ-kibi-search-answer-limits
type: req
---
A search answer shall be at most 16384 bytes. A search answer shall load at most 70 entity rows. A search answer shall list at most 5 governing requirements. A search answer shall list at most 8 linked facts per governing requirement. A search answer shall keep at most 280 characters of an ADR decision excerpt.

## Context

SEARCH_ANSWER_LIMITS in packages/cli/src/search-answer.ts bounds the answer REQ-kibi-search-answer-layer-v2 returns: its size in bytes, the entity rows it loads, the governing requirements and linked facts it lists, and the length of an ADR excerpt. Each bound is stated here so it is proved against the field.

## Source

Maintainer decision, 2026-10-27, approving requirement rewrites and splits that let structural claims be proved: "Please work towards full proof." Restated 2026-10-28: "Can we do more than 7? Kibi doesn't have a UI, so it should be possible to proove more?"