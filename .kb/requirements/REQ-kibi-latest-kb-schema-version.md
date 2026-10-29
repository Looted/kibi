---
title: Latest knowledge base schema version
status: open
priority: must
firmness: firm
semantic_text: The latest knowledge base schema version shall be 13.
semantic_clauses:
  - The latest knowledge base schema version shall be 13.
tags:
  - proof
origin:
  kind: agent
  ref: 'Maintainer decision, 2026-10-27, approving requirement rewrites and splits that let structural claims be proved: "Please work towards full proof." Restated 2026-10-28: "Can we do more than 7? Kibi doesn''t have a UI, so it should be possible to proove more?"'
  approved_by: maintainer
  recorded_at: '2026-10-29T10:58:04.408Z'
semantic_inventory_version: kibi.semantic-inventory.v1
semantic_source_field: semantic_text
semantic_source_hash: bd839ea6e841b9ccaba37ece864866072aea7d9d5551513de398b26c3bd0b839
semantic_inventory:
  - claim_key: CLAIM-FE5C9D3D6AB1DEB5
    claim_text: The latest knowledge base schema version shall be 13
    role: normative
    status: modeled
    span:
      start: 0
      end: 52
logic_claims:
  - CLAIM-FE5C9D3D6AB1DEB5
id: REQ-kibi-latest-kb-schema-version
type: req
---
The latest knowledge base schema version shall be 13.

## Context

packages/cli/src/utils/schema-version.ts holds the schema version kibi migrate brings a knowledge base to. It is stated here so it is proved against the constant.

## Source

Maintainer decision, 2026-10-27, approving requirement rewrites and splits that let structural claims be proved: "Please work towards full proof." Restated 2026-10-28: "Can we do more than 7? Kibi doesn't have a UI, so it should be possible to proove more?"