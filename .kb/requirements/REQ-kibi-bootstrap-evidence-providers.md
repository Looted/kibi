---
title: Bootstrap evidence providers
status: open
priority: must
firmness: firm
semantic_text: A bootstrap evidence provider shall be typed_kibi_docs, generic_repo_docs, repo_metadata, repo_layout, test_topology or source_symbols.
semantic_clauses:
  - A bootstrap evidence provider shall be typed_kibi_docs, generic_repo_docs, repo_metadata, repo_layout, test_topology or source_symbols.
tags:
  - proof
origin:
  kind: agent
  ref: 'Maintainer decision, 2026-10-27, approving requirement rewrites and splits that let structural claims be proved: "Please work towards full proof." Restated 2026-10-28: "Can we do more than 7? Kibi doesn''t have a UI, so it should be possible to proove more?"'
  approved_by: maintainer
  recorded_at: '2026-10-29T10:35:06.612Z'
semantic_inventory_version: kibi.semantic-inventory.v1
semantic_source_field: semantic_text
semantic_source_hash: a2efb354c0ce0a719abe04fa66f87b5a54f923ca2b20ea8137ccbdf55237a020
semantic_inventory:
  - claim_key: CLAIM-BC80604F70BA94D3
    claim_text: A bootstrap evidence provider shall be typed_kibi_docs, generic_repo_docs, repo_metadata, repo_layout, test_topology or source_symbols
    role: normative
    status: modeled
    span:
      start: 0
      end: 134
logic_claims:
  - CLAIM-BC80604F70BA94D3
id: REQ-kibi-bootstrap-evidence-providers
type: req
---
A bootstrap evidence provider shall be typed_kibi_docs, generic_repo_docs, repo_metadata, repo_layout, test_topology or source_symbols.

## Context

packages/cli/src/operations/bootstrap/types.ts names the providers REQ-KIBI-BOOTSTRAP-PLAN gathers evidence from. The provider set is stated here so it is proved against the provider order.

## Source

Maintainer decision, 2026-10-27, approving requirement rewrites and splits that let structural claims be proved: "Please work towards full proof." Restated 2026-10-28: "Can we do more than 7? Kibi doesn't have a UI, so it should be possible to proove more?"