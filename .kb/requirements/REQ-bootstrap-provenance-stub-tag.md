---
title: Bootstrap provenance stub tag
status: open
priority: must
firmness: firm
semantic_text: A bootstrap provenance stub shall be tagged bootstrap:provenance-stub.
semantic_clauses:
  - A bootstrap provenance stub shall be tagged bootstrap:provenance-stub.
tags:
  - proof
origin:
  kind: agent
  ref: 'Maintainer decision, 2026-10-27, approving requirement rewrites and splits that let structural claims be proved: "Please work towards full proof." Restated 2026-10-28: "Can we do more than 7? Kibi doesn''t have a UI, so it should be possible to proove more?"'
  approved_by: maintainer
  recorded_at: '2026-10-29T16:52:58.273Z'
semantic_inventory_version: kibi.semantic-inventory.v1
semantic_source_field: semantic_text
semantic_source_hash: 7b1338ee21249331b0cecb9bf4e45889af0c071fa3c707deed78b40ba9829eec
semantic_inventory:
  - claim_key: CLAIM-06DF3CA2975C9A30
    claim_text: A bootstrap provenance stub shall be tagged bootstrap:provenance-stub
    role: normative
    status: modeled
    span:
      start: 0
      end: 69
logic_claims:
  - CLAIM-06DF3CA2975C9A30
id: REQ-bootstrap-provenance-stub-tag
type: req
---
A bootstrap provenance stub shall be tagged bootstrap:provenance-stub.

## Context

packages/cli/src/provenance-stub.ts marks the stubs REQ-bootstrap-provenance-stubs creates so search and checks can tell them apart. The tag is stated here so it is proved against the constant.

## Source

Maintainer decision, 2026-10-27, approving requirement rewrites and splits that let structural claims be proved: "Please work towards full proof." Restated 2026-10-28: "Can we do more than 7? Kibi doesn't have a UI, so it should be possible to proove more?"