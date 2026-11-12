---
title: Latest knowledge base schema version
status: open
priority: must
firmness: default
semantic_text: The latest knowledge base schema version shall be 15.
semantic_clauses:
  - The latest knowledge base schema version shall be 15.
tags:
  - proof
origin:
  kind: agent
  ref: 'Maintainer decision, 2026-10-27, approving requirement rewrites and splits that let structural claims be proved: "Please work towards full proof." Restated 2026-10-28: "Can we do more than 7? Kibi doesn''t have a UI, so it should be possible to proove more?" Firmness relabelled to default until reviewed. Maintainer decision, 2026-11-03, approving the requirements audit fixes (exact bundled skill sets, the kibi-provable-code skill requirement, requirement body cleanup, firmness relabelling and neutral origin references): "Yes, do both suggested."'
  approved_by: maintainer
  recorded_at: '2026-10-29T10:58:04.408Z'
semantic_inventory_version: kibi.semantic-inventory.v1
semantic_source_field: semantic_text
semantic_source_hash: c80e77c072de53feeb32b44b53c34fe8531eebfb2c6662a75cb5bf1a348735e8
semantic_inventory:
  - claim_key: CLAIM-38D7520945D017E1
    claim_text: The latest knowledge base schema version shall be 15
    role: normative
    status: modeled
    span:
      start: 0
      end: 52
logic_claims:
  - CLAIM-38D7520945D017E1
id: REQ-kibi-latest-kb-schema-version
type: req
required_evidence: tested
---
The latest knowledge base schema version shall be 15.

## Context

packages/cli/src/utils/schema-version.ts holds the schema version kibi migrate brings a knowledge base to. It is stated here so it is proved against the constant.

## Source

Maintainer decision, 2026-10-27, approving requirement rewrites and splits that let structural claims be proved: "Please work towards full proof." Restated 2026-10-28: "Can we do more than 7? Kibi doesn't have a UI, so it should be possible to proove more?"
