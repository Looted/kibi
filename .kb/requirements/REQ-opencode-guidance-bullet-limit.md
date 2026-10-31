---
title: OpenCode guidance bullet limit
status: open
priority: must
firmness: firm
tags:
  - proof
semantic_text: An OpenCode Kibi guidance block shall hold at most 5 bullets.
semantic_clauses:
  - An OpenCode Kibi guidance block shall hold at most 5 bullets.
origin:
  kind: agent
  ref: 'Maintainer request, 2026-10-30, to keep proving structural requirements: "Can you continue prooving additional requirements?"'
  approved_by: maintainer
  recorded_at: '2026-10-30T19:44:21.746Z'
semantic_inventory_version: kibi.semantic-inventory.v1
semantic_source_field: semantic_text
semantic_source_hash: 253947e90ad1e4060c91c6caca0e8557e8e84d34121cafbb32a9efaa58ae1e1a
semantic_inventory:
  - claim_key: CLAIM-E09239D150DB56C0
    claim_text: An OpenCode Kibi guidance block shall hold at most 5 bullets
    role: normative
    status: modeled
    span:
      start: 0
      end: 60
logic_claims:
  - CLAIM-E09239D150DB56C0
id: REQ-opencode-guidance-bullet-limit
type: req
---
An OpenCode Kibi guidance block shall hold at most 5 bullets.

## Context

REQ-opencode-guidance-injection limits the OpenCode plugin to one guidance block per injection. How many bullets that block holds is stated here so it is proved against MAX_BULLETS in packages/opencode/src/prompt.ts.

## Source

Maintainer request, 2026-10-30, to keep proving structural requirements: "Can you continue prooving additional requirements?"
