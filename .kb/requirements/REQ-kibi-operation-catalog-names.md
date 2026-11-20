---
title: Kibi operation catalog names
status: open
priority: must
firmness: default
semantic_text: A Kibi catalog operation shall be one of the 27 operations the catalog names.
semantic_clauses:
  - A Kibi catalog operation shall be one of the 27 operations the catalog names
tags:
  - proof
origin:
  kind: agent
  ref: 'Maintainer decision, 2026-10-27, approving requirement rewrites and splits that let structural claims be proved: "Please work towards full proof." Restated 2026-10-28: "Can we do more than 7? Kibi doesn''t have a UI, so it should be possible to proove more?" Firmness relabelled to default until reviewed. Maintainer decision, 2026-11-03, approving the requirements audit fixes (exact bundled skill sets, the kibi-provable-code skill requirement, requirement body cleanup, firmness relabelling and neutral origin references): "Yes, do both suggested." Maintainer decision, 2026-11-16, approving the catalog count of 25 operations once kb_review_firm_edit joined the catalog: "Approve 25 operations". Maintainer decision, 2026-11-17, approving this count change as worded: "Add kb_record to the defaults and pay for it with enum encoding: yes, both in the kb_record PR". Maintainer decision, 2026-11-20, approving the count change once kb_author_impact_review joined the catalog and the default MCP tools: "Yes".'
  approved_by: maintainer
  recorded_at: '2026-11-16T09:32:28.155Z'
semantic_inventory_version: kibi.semantic-inventory.v1
semantic_source_field: semantic_text
semantic_source_hash: 54920cca143187d2c6b5abe27a60b0f2c11842db346f07cfc4556a2829792138
semantic_inventory:
  - claim_key: CLAIM-62E78938175836BF
    claim_text: A Kibi catalog operation shall be one of the 27 operations the catalog names
    role: normative
    status: modeled
    span:
      start: 0
      end: 76
logic_claims:
  - CLAIM-62E78938175836BF
id: REQ-kibi-operation-catalog-names
type: req
required_evidence: tested
---
A Kibi catalog operation shall be one of the 27 operations the catalog names.

## Context

packages/cli/src/public/operations/catalog.ts is the single catalog REQ-kibi-operation-interface-parity has the CLI and MCP serve. The name of every entry is stated here so the operation set is proved against the catalog itself.

## Source

Maintainer decision, 2026-10-27, approving requirement rewrites and splits that let structural claims be proved: "Please work towards full proof." Restated 2026-10-28: "Can we do more than 7? Kibi doesn't have a UI, so it should be possible to proove more?"