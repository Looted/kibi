---
title: Kibi operation catalog names
status: open
priority: must
firmness: firm
semantic_text: A Kibi catalog operation shall be one of the 24 operations the catalog names.
semantic_clauses:
  - A Kibi catalog operation shall be one of the 24 operations the catalog names.
tags:
  - proof
origin:
  kind: agent
  ref: 'Maintainer decision, 2026-10-27, approving requirement rewrites and splits that let structural claims be proved: "Please work towards full proof." Restated 2026-10-28: "Can we do more than 7? Kibi doesn''t have a UI, so it should be possible to proove more?"'
  approved_by: maintainer
  recorded_at: '2026-10-28T22:38:28.615Z'
semantic_inventory_version: kibi.semantic-inventory.v1
semantic_source_field: semantic_text
semantic_source_hash: d9627b73d53a12f9ac916617370d7610ed339009b954d49c7f15dc9f89aa38c6
semantic_inventory:
  - claim_key: CLAIM-9647A6984DF59611
    claim_text: A Kibi catalog operation shall be one of the 24 operations the catalog names
    role: normative
    status: modeled
    span:
      start: 0
      end: 76
logic_claims:
  - CLAIM-9647A6984DF59611
id: REQ-kibi-operation-catalog-names
type: req
---
A Kibi catalog operation shall be one of the 24 operations the catalog names.

## Context

packages/cli/src/public/operations/catalog.ts is the single catalog REQ-kibi-operation-interface-parity has the CLI and MCP serve. The name of every entry is stated here so the operation set is proved against the catalog itself.

## Source

Maintainer decision, 2026-10-27, approving requirement rewrites and splits that let structural claims be proved: "Please work towards full proof." Restated 2026-10-28: "Can we do more than 7? Kibi doesn't have a UI, so it should be possible to proove more?"