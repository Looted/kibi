---
title: Signoff fence names
status: open
priority: must
firmness: firm
semantic_text: The signoff summary fence shall be kibi-signoff. The signoff questions fence shall be kibi-questions.
semantic_clauses:
  - The signoff summary fence shall be kibi-signoff.
  - The signoff questions fence shall be kibi-questions.
tags:
  - proof
origin:
  kind: agent
  ref: 'Maintainer decision, 2026-10-27, approving requirement rewrites and splits that let structural claims be proved: "Please work towards full proof." Restated 2026-10-28: "Can we do more than 7? Kibi doesn''t have a UI, so it should be possible to proove more?"'
  approved_by: maintainer
  recorded_at: '2026-10-29T10:46:07.287Z'
semantic_inventory_version: kibi.semantic-inventory.v1
semantic_source_field: semantic_text
semantic_source_hash: bfc81eb09ad164d4ec89b34cc59154f069ac7ad31011fee18c3bc84b0b410225
semantic_inventory:
  - claim_key: CLAIM-2AAFD8E6DA968351
    claim_text: The signoff summary fence shall be kibi-signoff
    role: normative
    status: modeled
    span:
      start: 0
      end: 47
  - claim_key: CLAIM-67426D4B8A8EC1F8
    claim_text: The signoff questions fence shall be kibi-questions
    role: normative
    status: modeled
    span:
      start: 49
      end: 100
logic_claims:
  - CLAIM-2AAFD8E6DA968351
  - CLAIM-67426D4B8A8EC1F8
id: REQ-kibi-signoff-fences
type: req
---
The signoff summary fence shall be kibi-signoff. The signoff questions fence shall be kibi-questions.

## Context

packages/cli/src/signoff/model.ts names the code fences REQ-kibi-signoff-views wraps the summary and the open questions in. Both are stated here so they are proved against the fence table.

## Source

Maintainer decision, 2026-10-27, approving requirement rewrites and splits that let structural claims be proved: "Please work towards full proof." Restated 2026-10-28: "Can we do more than 7? Kibi doesn't have a UI, so it should be possible to proove more?"