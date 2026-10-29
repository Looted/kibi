---
title: Bootstrap claim aspect limits
status: open
priority: must
firmness: firm
semantic_text: A bootstrap claim aspect shall hold at most 4 words. A bootstrap claim aspect shall hold at most 40 characters.
semantic_clauses:
  - A bootstrap claim aspect shall hold at most 4 words.
  - A bootstrap claim aspect shall hold at most 40 characters.
tags:
  - proof
origin:
  kind: agent
  ref: 'Maintainer decision, 2026-10-27, approving requirement rewrites and splits that let structural claims be proved: "Please work towards full proof." Restated 2026-10-28: "Can we do more than 7? Kibi doesn''t have a UI, so it should be possible to proove more?"'
  approved_by: maintainer
  recorded_at: '2026-10-29T16:50:51.501Z'
semantic_inventory_version: kibi.semantic-inventory.v1
semantic_source_field: semantic_text
semantic_source_hash: f7c2a934fda6b4610ab52570417991286b700d6561ed9dfebbaeb3f760236e35
semantic_inventory:
  - claim_key: CLAIM-080D8C60DC804755
    claim_text: A bootstrap claim aspect shall hold at most 4 words
    role: normative
    status: modeled
    span:
      start: 0
      end: 51
  - claim_key: CLAIM-B87D307EEB317415
    claim_text: A bootstrap claim aspect shall hold at most 40 characters
    role: normative
    status: modeled
    span:
      start: 53
      end: 110
logic_claims:
  - CLAIM-080D8C60DC804755
  - CLAIM-B87D307EEB317415
id: REQ-bootstrap-claim-aspect-limits
type: req
---
A bootstrap claim aspect shall hold at most 4 words. A bootstrap claim aspect shall hold at most 40 characters.

## Context

packages/cli/src/operations/bootstrap/requirement-claims.ts keeps the claim names REQ-bootstrap-claim-name-length bounds short by capping each aspect. Both caps are stated here so they are proved against the constants.

## Source

Maintainer decision, 2026-10-27, approving requirement rewrites and splits that let structural claims be proved: "Please work towards full proof." Restated 2026-10-28: "Can we do more than 7? Kibi doesn't have a UI, so it should be possible to proove more?"