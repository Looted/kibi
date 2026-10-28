---
title: Source analysis input limit
status: open
priority: must
firmness: firm
semantic_text: The maximum source analysis input shall be 5242880 code units.
semantic_clauses:
  - The maximum source analysis input shall be 5242880 code units.
tags:
  - proof
origin:
  kind: agent
  ref: 'Maintainer decision, 2026-10-27, approving requirement rewrites and splits that let structural claims be proved: "Please work towards full proof." Restated 2026-10-28: "Can we do more than 7? Kibi doesn''t have a UI, so it should be possible to proove more?"'
  approved_by: maintainer
  recorded_at: '2026-10-28T10:52:09.929Z'
semantic_inventory_version: kibi.semantic-inventory.v1
semantic_source_field: semantic_text
semantic_source_hash: ca7f80a986409547f389c3bbda9e9075f1032f86ed7faa312bb84bcbffde1797
semantic_inventory:
  - claim_key: CLAIM-82659EB982EDC5B2
    claim_text: The maximum source analysis input shall be 5242880 code units
    role: normative
    status: modeled
    span:
      start: 0
      end: 61
logic_claims:
  - CLAIM-82659EB982EDC5B2
id: REQ-capability-plugin-source-analysis-input-limit
type: req
---
The maximum source analysis input shall be 5242880 code units.

## Context

SOURCE_ANALYSIS_V2_MAX_INPUT_CODE_UNITS in kibi-plugin-sdk is the input bound REQ-capability-plugin-protocol-v1 sets for source analysis v2: 5 MiB of UTF-16 code units. It is stated here as a number so it is proved against the constant.

## Source

Maintainer decision, 2026-10-27, approving requirement rewrites and splits that let structural claims be proved: "Please work towards full proof." Restated 2026-10-28: "Can we do more than 7? Kibi doesn't have a UI, so it should be possible to proove more?"