---
title: OpenCode plugin id and bootstrap command
status: open
priority: must
firmness: firm
semantic_text: The OpenCode plugin id shall be kibi-opencode. The OpenCode bootstrap command shall be kibi-bootstrap.
semantic_clauses:
  - The OpenCode plugin id shall be kibi-opencode.
  - The OpenCode bootstrap command shall be kibi-bootstrap.
tags:
  - proof
origin:
  kind: agent
  ref: 'Maintainer decision, 2026-10-27, approving requirement rewrites and splits that let structural claims be proved: "Please work towards full proof." Restated 2026-10-28: "Can we do more than 7? Kibi doesn''t have a UI, so it should be possible to proove more?"'
  approved_by: maintainer
  recorded_at: '2026-10-29T17:01:34.563Z'
semantic_inventory_version: kibi.semantic-inventory.v1
semantic_source_field: semantic_text
semantic_source_hash: aef39a7ff61687f6508ce3646f48829e82a45f2859d47a70e20cb1d2cce399fe
semantic_inventory:
  - claim_key: CLAIM-E677C39A65904A11
    claim_text: The OpenCode plugin id shall be kibi-opencode
    role: normative
    status: modeled
    span:
      start: 0
      end: 45
  - claim_key: CLAIM-BAC667AC10500557
    claim_text: The OpenCode bootstrap command shall be kibi-bootstrap
    role: normative
    status: modeled
    span:
      start: 47
      end: 101
logic_claims:
  - CLAIM-E677C39A65904A11
  - CLAIM-BAC667AC10500557
id: REQ-opencode-plugin-ids
type: req
---
The OpenCode plugin id shall be kibi-opencode. The OpenCode bootstrap command shall be kibi-bootstrap.

## Context

packages/opencode/src registers the plugin REQ-opencode-kibi-plugin-v1 describes and its bootstrap command. Both names are stated here so they are proved against the constants.

## Source

Maintainer decision, 2026-10-27, approving requirement rewrites and splits that let structural claims be proved: "Please work towards full proof." Restated 2026-10-28: "Can we do more than 7? Kibi doesn't have a UI, so it should be possible to proove more?"