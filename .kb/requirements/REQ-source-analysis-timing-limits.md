---
title: Source analysis timing trace limits
status: open
priority: must
firmness: firm
semantic_text: A source analysis shall keep at most 5000 timing events. A source analysis timing trace shall keep at most 524288 bytes.
semantic_clauses:
  - A source analysis shall keep at most 5000 timing events.
  - A source analysis timing trace shall keep at most 524288 bytes.
tags:
  - proof
origin:
  kind: agent
  ref: 'Maintainer decision, 2026-10-27, approving requirement rewrites and splits that let structural claims be proved: "Please work towards full proof." Restated 2026-10-28: "Can we do more than 7? Kibi doesn''t have a UI, so it should be possible to proove more?"'
  approved_by: maintainer
  recorded_at: '2026-10-29T10:51:39.162Z'
semantic_inventory_version: kibi.semantic-inventory.v1
semantic_source_field: semantic_text
semantic_source_hash: 512967f22967b953fbc792e257245fb97306a29f86783710527825cd3d1b0fc4
semantic_inventory:
  - claim_key: CLAIM-D49D2FEFA9168696
    claim_text: A source analysis shall keep at most 5000 timing events
    role: normative
    status: modeled
    span:
      start: 0
      end: 55
  - claim_key: CLAIM-B83A4C1A65B84520
    claim_text: A source analysis timing trace shall keep at most 524288 bytes
    role: normative
    status: modeled
    span:
      start: 57
      end: 119
logic_claims:
  - CLAIM-D49D2FEFA9168696
  - CLAIM-B83A4C1A65B84520
id: REQ-source-analysis-timing-limits
type: req
---
A source analysis shall keep at most 5000 timing events. A source analysis timing trace shall keep at most 524288 bytes.

## Context

packages/plugin-treesitter/src/performance-timing.ts caps the timing trace REQ-installed-staged-impact-timing-integrity reads from source analysis. Both caps are stated here so they are proved against the constants.

## Source

Maintainer decision, 2026-10-27, approving requirement rewrites and splits that let structural claims be proved: "Please work towards full proof." Restated 2026-10-28: "Can we do more than 7? Kibi doesn't have a UI, so it should be possible to proove more?"