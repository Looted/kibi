---
title: Latest knowledge base schema version
status: open
priority: must
firmness: default
semantic_text: The latest knowledge base schema version shall be 20.
semantic_clauses:
  - The latest knowledge base schema version shall be 20.
tags:
  - proof
origin:
  kind: agent
  ref: 'Maintainer decision, 2026-10-27, approving requirement rewrites and splits that let structural claims be proved: "Please work towards full proof." Restated 2026-10-28: "Can we do more than 7? Kibi doesn''t have a UI, so it should be possible to proove more?" Firmness relabelled to default until reviewed. Maintainer decision, 2026-11-03, approving the requirements audit fixes (exact bundled skill sets, the kibi-provable-code skill requirement, requirement body cleanup, firmness relabelling and neutral origin references): "Yes, do both suggested." Maintainer decision, 2026-11-25, approving the Kibi level statements, whose statement 4 adds the schema 20 upgrade: "Approve all as written".'
  approved_by: maintainer
  recorded_at: '2026-11-25T10:09:00.695Z'
semantic_inventory_version: kibi.semantic-inventory.v1
semantic_source_field: semantic_text
semantic_source_hash: b8a309dd528dabe820d9c58c028a74f3163d83165354acb3383d7ed174a099b7
semantic_inventory:
  - claim_key: CLAIM-A86B00C9168C511B
    claim_text: The latest knowledge base schema version shall be 20
    role: normative
    status: modeled
    span:
      start: 0
      end: 52
logic_claims:
  - CLAIM-A86B00C9168C511B
id: REQ-kibi-latest-kb-schema-version
type: req
required_evidence: tested
---
The latest knowledge base schema version shall be 20.

## Context

packages/cli/src/utils/schema-version.ts holds the schema version kibi migrate brings a knowledge base to. It is stated here so it is proved against the constant.

## Source

Maintainer decision, 2026-10-27, approving requirement rewrites and splits that let structural claims be proved: "Please work towards full proof." Restated 2026-10-28: "Can we do more than 7? Kibi doesn't have a UI, so it should be possible to proove more?"
