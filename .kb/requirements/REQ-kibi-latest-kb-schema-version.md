---
title: Latest knowledge base schema version
status: open
priority: must
firmness: default
semantic_text: The latest knowledge base schema version shall be 14.
semantic_clauses:
  - The latest knowledge base schema version shall be 14.
tags:
  - proof
origin:
  kind: agent
  ref: 'Maintainer decision, 2026-10-27, approving requirement rewrites and splits that let structural claims be proved: "Please work towards full proof." Restated 2026-10-28: "Can we do more than 7? Kibi doesn''t have a UI, so it should be possible to proove more?" Firmness relabelled to default until reviewed. Maintainer decision, 2026-11-03, approving the requirements audit fixes (exact bundled skill sets, the kibi-provable-code skill requirement, requirement body cleanup, firmness relabelling and neutral origin references): "Yes, do both suggested."'
  approved_by: maintainer
  recorded_at: '2026-10-29T10:58:04.408Z'
semantic_inventory_version: kibi.semantic-inventory.v1
semantic_source_field: semantic_text
semantic_source_hash: 408d966d26e070348a571b3446cb92cf21b00045e39790631dbbb7078153c74d
semantic_inventory:
  - claim_key: CLAIM-48C64457D9D6CF6F
    claim_text: The latest knowledge base schema version shall be 14
    role: normative
    status: modeled
    span:
      start: 0
      end: 52
logic_claims:
  - CLAIM-48C64457D9D6CF6F
id: REQ-kibi-latest-kb-schema-version
type: req
required_evidence: tested
---
The latest knowledge base schema version shall be 14.

## Context

packages/cli/src/utils/schema-version.ts holds the schema version kibi migrate brings a knowledge base to. It is stated here so it is proved against the constant.

## Source

Maintainer decision, 2026-10-27, approving requirement rewrites and splits that let structural claims be proved: "Please work towards full proof." Restated 2026-10-28: "Can we do more than 7? Kibi doesn't have a UI, so it should be possible to proove more?"
