---
title: Failed source extraction code
status: open
priority: must
firmness: default
semantic_text: The failed source extraction code shall be source_extraction_failed.
semantic_clauses:
  - The failed source extraction code shall be source_extraction_failed.
tags:
  - proof
origin:
  kind: agent
  ref: 'Maintainer decision, 2026-10-27, approving requirement rewrites and splits that let structural claims be proved: "Please work towards full proof." Restated 2026-10-28: "Can we do more than 7? Kibi doesn''t have a UI, so it should be possible to proove more?" Firmness relabelled to default until reviewed. Maintainer decision, 2026-11-03, approving the requirements audit fixes (exact bundled skill sets, the kibi-provable-code skill requirement, requirement body cleanup, firmness relabelling and neutral origin references): "Yes, do both suggested."'
  approved_by: maintainer
  recorded_at: '2026-10-28T19:08:21.630Z'
semantic_inventory_version: kibi.semantic-inventory.v1
semantic_source_field: semantic_text
semantic_source_hash: 29c89573d52f47cef9306260c0b14559de645ec709337d339b62e6409a4adbce
semantic_inventory:
  - claim_key: CLAIM-0874142625D2A148
    claim_text: The failed source extraction code shall be source_extraction_failed
    role: normative
    status: modeled
    span:
      start: 0
      end: 67
logic_claims:
  - CLAIM-0874142625D2A148
id: REQ-uncompiled-source-code
type: req
required_evidence: tested
---
The failed source extraction code shall be source_extraction_failed.

## Context

REQ-kibi-uncompiled-source-reported has sync report a source file it could not extract instead of dropping it silently. The code it uses is stated here so it is proved against the constant.

## Source

Maintainer decision, 2026-10-27, approving requirement rewrites and splits that let structural claims be proved: "Please work towards full proof." Restated 2026-10-28: "Can we do more than 7? Kibi doesn't have a UI, so it should be possible to proove more?"