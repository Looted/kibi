---
title: Kibi operation catalog names
status: open
priority: must
firmness: default
semantic_text: A Kibi catalog operation shall be one of the 25 operations the catalog names.
semantic_clauses:
  - A Kibi catalog operation shall be one of the 25 operations the catalog names.
tags:
  - proof
origin:
  kind: agent
  approved_by: maintainer
  ref: 'Maintainer decision, 2026-10-27, approving requirement rewrites and splits that let structural claims be proved: "Please work towards full proof." Restated 2026-10-28: "Can we do more than 7? Kibi doesn''t have a UI, so it should be possible to proove more?" Firmness relabelled to default until reviewed. Maintainer decision, 2026-11-03, approving the requirements audit fixes (exact bundled skill sets, the kibi-provable-code skill requirement, requirement body cleanup, firmness relabelling and neutral origin references): "Yes, do both suggested." Maintainer decision, 2026-11-16, approving the catalog count of 25 operations once kb_review_firm_edit joined the catalog: "Approve 25 operations".'
  recorded_at: '2026-11-16T09:32:28.155Z'
semantic_inventory_version: kibi.semantic-inventory.v1
semantic_source_field: semantic_text
semantic_source_hash: 8631f02f7824890bb68a8a7cc4fcf047c048f68d2ba838940de1bd5be745d36e
semantic_inventory:
  - claim_key: CLAIM-5D894E84FA104A78
    claim_text: A Kibi catalog operation shall be one of the 25 operations the catalog names
    role: normative
    status: modeled
    span:
      start: 0
      end: 76
logic_claims:
  - CLAIM-5D894E84FA104A78
id: REQ-kibi-operation-catalog-names
type: req
required_evidence: tested
---
A Kibi catalog operation shall be one of the 25 operations the catalog names.

## Context

packages/cli/src/public/operations/catalog.ts is the single catalog REQ-kibi-operation-interface-parity has the CLI and MCP serve. The name of every entry is stated here so the operation set is proved against the catalog itself.

## Source

Maintainer decision, 2026-10-27, approving requirement rewrites and splits that let structural claims be proved: "Please work towards full proof." Restated 2026-10-28: "Can we do more than 7? Kibi doesn't have a UI, so it should be possible to proove more?"