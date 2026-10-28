---
title: Generated symbol coordinate format
status: open
priority: must
firmness: firm
semantic_text: The generated symbol fields shall be sourceLine, sourceColumn, sourceEndLine, sourceEndColumn and coordinatesGeneratedAt. The symbol coordinates format version shall be 2.
semantic_clauses:
  - The generated symbol fields shall be sourceLine, sourceColumn, sourceEndLine, sourceEndColumn and coordinatesGeneratedAt.
  - The symbol coordinates format version shall be 2.
tags:
  - proof
origin:
  kind: agent
  ref: 'Maintainer decision, 2026-10-27, approving requirement rewrites and splits that let structural claims be proved: "Please work towards full proof." Restated 2026-10-28: "Can we do more than 7? Kibi doesn''t have a UI, so it should be possible to proove more?"'
  approved_by: maintainer
  recorded_at: '2026-10-28T11:13:21.430Z'
semantic_inventory_version: kibi.semantic-inventory.v1
semantic_source_field: semantic_text
semantic_source_hash: eaad004df00ab72be46344dabfe159f3aa8cb345f9a12e1924598606f3115c1e
semantic_inventory:
  - claim_key: CLAIM-5A378556E38551B7
    claim_text: The generated symbol fields shall be sourceLine, sourceColumn, sourceEndLine, sourceEndColumn and coordinatesGeneratedAt
    role: normative
    status: modeled
    span:
      start: 0
      end: 120
  - claim_key: CLAIM-EEBE9761ABA24406
    claim_text: The symbol coordinates format version shall be 2
    role: normative
    status: modeled
    span:
      start: 122
      end: 170
logic_claims:
  - CLAIM-5A378556E38551B7
  - CLAIM-EEBE9761ABA24406
id: REQ-generated-coordinate-settings
type: req
---
The generated symbol fields shall be sourceLine, sourceColumn, sourceEndLine, sourceEndColumn and coordinatesGeneratedAt. The symbol coordinates format version shall be 2.

## Context

REQ-generated-coordinate-persistence keeps symbol coordinates out of the authored manifest: the generated fields are the line and column bounds and their timestamp, and the derived coordinates file carries a format version. Both are stated here so they are proved against the constants.

## Source

Maintainer decision, 2026-10-27, approving requirement rewrites and splits that let structural claims be proved: "Please work towards full proof." Restated 2026-10-28: "Can we do more than 7? Kibi doesn't have a UI, so it should be possible to proove more?"